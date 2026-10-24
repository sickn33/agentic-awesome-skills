# Ruby Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Dynamic Code Execution

```ruby
# DANGEROUS: eval executes arbitrary code
eval(user_input)

# DANGEROUS: send calls arbitrary method
object.send(user_input, *args)
object.public_send(user_input)  # Only public, still dangerous

# DANGEROUS: constantize gets arbitrary class
user_input.constantize  # Rails
Object.const_get(user_input)

# DANGEROUS: instance_variable_get/set
obj.instance_variable_set("@#{user_input}", value)
```

**Real Vulnerabilities**:
- CVE-2013-0156: Rails XML parameter parsing led to code execution
- Countless Rails apps vulnerable to controller#action injection

**Fix**: Whitelist allowed values:
```ruby
ALLOWED_METHODS = %w[create update delete].freeze
raise unless ALLOWED_METHODS.include?(user_input)
object.send(user_input)
```

## YAML.load RCE

```ruby
# Historical/unsafe Psych loaders can instantiate objects; modern Psych defaults differ.
YAML.load(user_input)  # Verify version; use explicitly configured safe_load for untrusted data.

# Attacker payload:
# --- !ruby/object:Gem::Installer
# i: x
# --- !ruby/object:Gem::SpecFetcher
# i: y
# --- !ruby/object:Gem::Requirement
# requirements:
#   !ruby/object:Gem::Package::TarReader
#   io: &1 !ruby/object:Net::BufferedIO
#     ...

# Chains through multiple classes to achieve RCE
```

**Fix**: Use `YAML.safe_load`:
```ruby
YAML.safe_load(user_input)
YAML.safe_load(user_input, permitted_classes: [Date, Time])
```

## Mass Assignment

```ruby
# DANGEROUS: All params assigned to model (Rails < 4)
User.new(params[:user])
# If params includes {admin: true, role: "superuser"}...

# Also dangerous with update_attributes
user.update_attributes(params[:user])
```

**Fix**: Strong Parameters (Rails 4+):
```ruby
def user_params
    params.require(:user).permit(:name, :email)  # Allowlist
end

User.new(user_params)
```

## SQL Injection

```ruby
# DANGEROUS: String interpolation in queries
User.where("name = '#{params[:name]}'")
User.where("name = '" + params[:name] + "'")

# DANGEROUS: Array form with interpolation
User.where(["name = ?", params[:name]])  # Safe
User.where(["name = #{params[:name]}"])  # NOT safe!

# DANGEROUS: order() with user input
User.order(params[:sort])  # Can inject: "name; DROP TABLE users--"
```

**Fix**: Use parameterized queries:
```ruby
User.where(name: params[:name])
User.where("name = ?", params[:name])
allowed_sort = {"name" => :name, "created" => :created_at}
User.order(allowed_sort.fetch(params[:sort]))  # Fixed identifiers; Arel.sql is not sanitization
```

## Command Injection

```ruby
# DANGEROUS: Backticks and system with interpolation
`ls #{params[:dir]}`
system("ls #{params[:dir]}")
exec("ls #{params[:dir]}")
%x(ls #{params[:dir]})

# Attacker: dir="; rm -rf /"
```

**Fix**: Use array form:
```ruby
system("ls", "--", approved_directory)  # Argument passed safely
Open3.capture3("ls", "--", approved_directory)
```

## Regex Injection

```ruby
# DANGEROUS: User input in regex
pattern = Regexp.new(params[:pattern])
string.match(pattern)

# ReDoS attack: pattern = "(a+)+"
# Denial of service

# Also: Anchors don't work as expected
/^admin$/.match("admin\nuser")  # Matches! ^ and $ match line boundaries
```

**Fix**: Use `\A` and `\z` for string boundaries:
```ruby
/\Aadmin\z/  # Only matches exactly "admin"
Regexp.escape(user_input)  # Escape special characters
```

## Symbol DoS (Ruby < 2.2)

```ruby
# DANGEROUS in Ruby < 2.2: Symbols never garbage collected
params[:key].to_sym  # Each unique key creates permanent symbol

# Attacker sends millions of unique parameter names
# Memory exhaustion - symbols fill memory
```

**Note**: Fixed in Ruby 2.2+ with symbol GC, but still worth avoiding unnecessary `to_sym` on user input.

## Method Visibility

```ruby
# DANGEROUS: private/protected don't prevent send()
class Secret
    private
    def sensitive_data
        "secret"
    end
end

obj.send(:sensitive_data)  # Works!
obj.sensitive_data         # NoMethodError (as expected)
```

## Mutable Arguments and Default Evaluation

```ruby
# Ruby evaluates default argument expressions on each call, unlike Python.
def add_item(item, list = [])
    list << item
    list
end

add_item(1)  # [1]
add_item(2)  # [2] - a fresh default array
```

**Alternative**: a nil default also works; a caller-supplied array is still mutated:
```ruby
def add_item(item, list = nil)
    list ||= []
    list << item
end
```

## ERB Template Injection

```ruby
# DANGEROUS: User input in ERB template
template = ERB.new(params[:template])
template.result(binding)

# Attacker template: <%= `whoami` %>
# Executes shell command

# Also via:
template = params[:template]
eval("\"#{template}\"")  # If template contains #{}
```

## File Operations

```ruby
# DANGEROUS: Path traversal
File.read("uploads/#{params[:filename]}")
# Attacker: filename=../../../etc/passwd

# DANGEROUS: File.open with pipe
Kernel.open("|#{params[:cmd]}")  # Interprets a leading pipe as a command

# The | prefix runs a command and opens pipe to it
IO.popen(user_command)  # Starts a process; never pass untrusted command text
```

**Fix**: Validate and sanitize paths:
```ruby
path = File.expand_path(params[:filename], uploads_dir)
root = File.realpath(uploads_dir)
path = File.realpath(path)
raise unless path == root || path.start_with?(root + File::SEPARATOR)
# For missing files, validate the existing parent and open safely; recheck symlinks/races.
```

## Comparison Gotchas

```ruby
# DANGEROUS: == vs eql? vs equal?
a = "hello"
b = "hello"

a == b       # true - value comparison
a.eql?(b)    # true - value + type comparison
a.equal?(b)  # false - identity comparison

# Array comparison
[1, 2] == [1, 2]  # true
[1, 2].eql?([1, 2])  # true
[1, 2].equal?([1, 2])  # false
```

## Thread Safety

```ruby
# DANGEROUS: Ruby global interpreter lock (GIL) doesn't protect everything
@counter = 0

threads = 10.times.map do
    Thread.new { 1000.times { @counter += 1 } }
end
threads.each(&:join)

@counter  # May not be 10000! Read-modify-write isn't atomic
```

**Fix**: Use Mutex or atomic operations:
```ruby
mutex = Mutex.new
mutex.synchronize { @counter += 1 }
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `eval(`, `instance_eval(` | Code execution |
| `.send(user_input`, `.public_send(` | Method injection |
| `.constantize`, `const_get(` | Class injection |
| `YAML.load(` | Deserialization RCE |
| `.new(params[` without strong params | Mass assignment |
| `where("... #{` | SQL injection |
| `` `...#{` ``, `system("...#{` | Command injection |
| `Regexp.new(user_input)` | ReDoS |
| `params[:x].to_sym` | Symbol DoS (old Ruby) |
| `ERB.new(user_input)` | Template injection |
| `Kernel.open("|...` or `IO.popen(` | Command execution |
| `File.read(params[` without path validation | Path traversal |
