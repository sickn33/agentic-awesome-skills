# Entity Framework Core Best Practices

Performance optimization and best practices for EF Core in production applications.

## Query Optimization

### 1. Use AsNoTracking for Read-Only Queries

```csharp
// ✅ Good - No change tracking overhead
var products = await _context.Products
    .AsNoTracking()
    .Where(p => p.CategoryId == categoryId)
    .ToListAsync(ct);

// ❌ Bad - Unnecessary tracking for read-only data
var products = await _context.Products
    .Where(p => p.CategoryId == categoryId)
    .ToListAsync(ct);
```

### 2. Select Only Needed Columns

```csharp
// ✅ Good - Project to DTO
var products = await _context.Products
    .AsNoTracking()
    .Where(p => p.CategoryId == categoryId)
    .Select(p => new ProductDto
    {
        Id = p.Id,
        Name = p.Name,
        Price = p.Price
    })
    .ToListAsync(ct);

// ❌ Bad - Fetching all columns
var products = await _context.Products
    .Where(p => p.CategoryId == categoryId)
    .ToListAsync(ct);
```

### 3. Avoid N+1 Queries with Eager Loading

```csharp
// ✅ Good - Single query with Include
var orders = await _context.Orders
    .AsNoTracking()
    .Include(o => o.Items)
        .ThenInclude(i => i.Product)
    .Where(o => o.CustomerId == customerId)
    .ToListAsync(ct);

// ❌ Bad - N+1 queries (lazy loading)
var orders = await _context.Orders
    .Where(o => o.CustomerId == customerId)
    .ToListAsync(ct);

foreach (var order in orders)
{
    // Each iteration triggers a separate query!
    var items = order.Items.ToList();
}
```

### 4. Use Split Queries for Large Includes

```csharp
// ✅ Good - Prevents cartesian explosion
var orders = await _context.Orders
    .AsNoTracking()
    .Include(o => o.Items)
    .Include(o => o.Payments)
    .Include(o => o.ShippingHistory)
    .AsSplitQuery()  // Executes as multiple queries
    .Where(o => o.CustomerId == customerId)
    .ToListAsync(ct);
```

### 5. Use Compiled Queries for Hot Paths

```csharp
public class ProductRepository
{
    // Compile once, reuse many times
    private static readonly Func<AppDbContext, string, Task<Product?>> GetByIdQuery =
        EF.CompileAsyncQuery((AppDbContext ctx, string id) =>
            ctx.Products.AsNoTracking().FirstOrDefault(p => p.Id == id));

    private static readonly Func<AppDbContext, int, IAsyncEnumerable<Product>> GetByCategoryQuery =
        EF.CompileAsyncQuery((AppDbContext ctx, int categoryId) =>
            ctx.Products.AsNoTracking().Where(p => p.CategoryId == categoryId));

    public Task<Product?> GetByIdAsync(string id, CancellationToken ct)
        => GetByIdQuery(_context, id);

    public IAsyncEnumerable<Product> GetByCategoryAsync(int categoryId)
        => GetByCategoryQuery(_context, categoryId);
}
```

## Batch Operations

### 6. Use ExecuteUpdate/ExecuteDelete (.NET 7+)

```csharp
// ✅ Good - Single SQL UPDATE
await _context.Products
    .Where(p => p.CategoryId == oldCategoryId)
    .ExecuteUpdateAsync(s => s
        .SetProperty(p => p.CategoryId, newCategoryId)
        .SetProperty(p => p.UpdatedAt, DateTime.UtcNow),
        ct);

// ✅ Good - Single SQL DELETE
await _context.Products
    .Where(p => p.IsDeleted && p.UpdatedAt < cutoffDate)
    .ExecuteDeleteAsync(ct);

// ❌ Bad - Loads all entities into memory
var products = await _context.Products
    .Where(p => p.CategoryId == oldCategoryId)
    .ToListAsync(ct);

foreach (var product in products)
{
    product.CategoryId = newCategoryId;
}
await _context.SaveChangesAsync(ct);
```

### 7. Bulk Insert with EFCore.BulkExtensions

```csharp
// Using EFCore.BulkExtensions package
var products = GenerateLargeProductList();

// ✅ Good - Bulk insert (much faster for large datasets)
await _context.BulkInsertAsync(products, ct);

// ❌ Bad - Individual inserts
foreach (var product in products)
{
    _context.Products.Add(product);
}
await _context.SaveChangesAsync(ct);
```

## Connection Management

### 8. Configure Connection Pooling

```csharp
services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString, sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null);
        
        sqlOptions.CommandTimeout(30);
    });
    
    // Performance settings
    options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
    
    // Development only
    if (env.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});
```

### 9. Use DbContext Pooling

```csharp
// ✅ Good - Context pooling (reduces allocation overhead)
services.AddDbContextPool<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString);
}, poolSize: 128);

// Instead of AddDbContext
```

## Concurrency and Transactions

### 10. Handle Concurrency with Row Versioning

```csharp
public class Product
{
    public string Id { get; set; }
    public string Name { get; set; }
    
    [Timestamp]
    public byte[] RowVersion { get; set; }  // SQL Server rowversion
}

// Or with Fluent API
builder.Property(p => p.RowVersion)
    .IsRowVersion();

// Handle concurrency conflicts
try
{
    await _context.SaveChangesAsync(ct);
}
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var databaseValues = await entry.GetDatabaseValuesAsync(ct);
    
    if (databaseValues == null)
    {
        // Entity was deleted
        throw new NotFoundException("Product was deleted by another user");
    }
    
    // Client wins - overwrite database values
    entry.OriginalValues.SetValues(databaseValues);
    await _context.SaveChangesAsync(ct);
}
```

### 11. Use Explicit Transactions When Needed

```csharp
await using var transaction = await _context.Database.BeginTransactionAsync(ct);

try
{
    // Multiple operations
    _context.Orders.Add(order);
    await _context.SaveChangesAsync(ct);
    
    await _context.OrderItems.AddRangeAsync(items, ct);
    await _context.SaveChangesAsync(ct);
    
    await _paymentService.ProcessAsync(order.Id, ct);
    
    await transaction.CommitAsync(ct);
}
catch
{
    await transaction.RollbackAsync(ct);
    throw;
}
```

## Indexing Strategy

### 12. Create Indexes for Query Patterns

```csharp
public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        // Unique index
        builder.HasIndex(p => p.Sku)
            .IsUnique();
        
        // Composite index for common query patterns
        builder.HasIndex(p => new { p.CategoryId, p.Name });
        
        // Filtered index (SQL Server)
        builder.HasIndex(p => p.Price)
            .HasFilter("[IsDeleted] = 0");
        
        // Include columns for covering index
        builder.HasIndex(p => p.CategoryId)
            .IncludeProperties(p => new { p.Name, p.Price });
    }
}
```

## Common Anti-Patterns to Avoid

### ❌ Calling ToList() Too Early

```csharp
// ❌ Bad - Materializes all products then filters in memory
var products = _context.Products.ToList()
    .Where(p => p.Price > 100);

// ✅ Good - Filter in SQL
var products = await _context.Products
    .Where(p => p.Price > 100)
    .ToListAsync(ct);
```

### ❌ Using Contains with Large Collections

```csharp
// ❌ Bad - Generates massive IN clause
var ids = GetThousandsOfIds();
var products = await _context.Products
    .Where(p => ids.Contains(p.Id))
    .ToListAsync(ct);

// ✅ Good - Use temp table or batch queries
var products = new List<Product>();
foreach (var batch in ids.Chunk(100))
{
    var batchResults = await _context.Products
        .Where(p => batch.Contains(p.Id))
        .ToListAsync(ct);
    products.AddRange(batchResults);
}
```

### ❌ String Concatenation in Queries

```csharp
// ❌ Bad - Can't use index
var products = await _context.Products
    .Where(p => (p.FirstName + " " + p.LastName).Contains(searchTerm))
    .ToListAsync(ct);

// ✅ Good - Use computed column with index
builder.Property(p => p.FullName)
    .HasComputedColumnSql("[FirstName] + ' ' + [LastName]");
builder.HasIndex(p => p.FullName);
```

## Monitoring and Diagnostics

```csharp
// Log slow queries
services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString);
    
    options.LogTo(
        filter: (eventId, level) => eventId.Id == CoreEventId.QueryExecutionPlanned.Id,
        logger: (eventData) =>
        {
            if (eventData is QueryExpressionEventData queryData)
            {
                var duration = queryData.Duration;
                if (duration > TimeSpan.FromSeconds(1))
                {
                    _logger.LogWarning("Slow query detected: {Duration}ms - {Query}",
                        duration.TotalMilliseconds,
                        queryData.Expression);
                }
            }
        });
});
```
