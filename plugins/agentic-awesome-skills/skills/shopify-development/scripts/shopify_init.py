#!/usr/bin/env python3
"""
Shopify Project Initialization Script

Interactive script to scaffold Shopify apps, extensions, or themes.
Supports environment variable loading from multiple locations.
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Optional, List
from dataclasses import dataclass


@dataclass
class EnvConfig:
    """Environment configuration container."""
    shopify_api_key: Optional[str] = None
    shopify_api_secret: Optional[str] = None
    shop_domain: Optional[str] = None
    scopes: Optional[str] = None


class EnvLoader:
    """Load environment variables from multiple sources in priority order."""

    @staticmethod
    def load_env_file(filepath: Path) -> Dict[str, str]:
        """
        Load environment variables from .env file.

        Args:
            filepath: Path to .env file

        Returns:
            Dictionary of environment variables
        """
        env_vars = {}
        if not filepath.exists():
            return env_vars

        try:
            with open(filepath, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Warning: Failed to load {filepath}: {e}")

        return env_vars

    @staticmethod
    def get_env_paths(skill_dir: Path) -> List[Path]:
        """
        Get list of .env file paths in priority order.

        Works with any AI tool directory structure:
        - .agent/skills/ (universal)
        - .claude/skills/ (Claude Code)
        - .gemini/skills/ (Gemini CLI)
        - .cursor/skills/ (Cursor)

        Priority: process.env > skill/.env > skills/.env > agent_dir/.env

        Args:
            skill_dir: Path to skill directory

        Returns:
            List of .env file paths
        """
        paths = []

        # skill/.env
        skill_env = skill_dir / '.env'
        if skill_env.exists():
            paths.append(skill_env)

        # skills/.env
        skills_env = skill_dir.parent / '.env'
        if skills_env.exists():
            paths.append(skills_env)

        # agent_dir/.env (e.g., .agent, .claude, .gemini, .cursor)
        agent_env = skill_dir.parent.parent / '.env'
        if agent_env.exists():
            paths.append(agent_env)

        return paths

    @staticmethod
    def load_config(skill_dir: Path) -> EnvConfig:
        """
        Load configuration from environment variables.

        Works with any AI tool directory structure.
        Priority: process.env > skill/.env > skills/.env > agent_dir/.env

        Args:
            skill_dir: Path to skill directory

        Returns:
            EnvConfig object
        """
        config = EnvConfig()

        # Load from .env files (reverse priority order)
        # Files may be inspected, but ambient parent .env files are not loaded
        # unless the caller explicitly opts in for this process.
        env_paths = EnvLoader.get_env_paths(skill_dir) if os.environ.get('SHOPIFY_LOAD_ENV_FILES') == '1' else []
        for env_path in reversed(env_paths):
            env_vars = EnvLoader.load_env_file(env_path)
            if 'SHOPIFY_API_KEY' in env_vars:
                config.shopify_api_key = env_vars['SHOPIFY_API_KEY']
            if 'SHOPIFY_API_SECRET' in env_vars:
                config.shopify_api_secret = env_vars['SHOPIFY_API_SECRET']
            if 'SHOP_DOMAIN' in env_vars:
                config.shop_domain = env_vars['SHOP_DOMAIN']
            if 'SCOPES' in env_vars:
                config.scopes = env_vars['SCOPES']

        # Override with process environment (highest priority)
        if 'SHOPIFY_API_KEY' in os.environ:
            config.shopify_api_key = os.environ['SHOPIFY_API_KEY']
        if 'SHOPIFY_API_SECRET' in os.environ:
            config.shopify_api_secret = os.environ['SHOPIFY_API_SECRET']
        if 'SHOP_DOMAIN' in os.environ:
            config.shop_domain = os.environ['SHOP_DOMAIN']
        if 'SCOPES' in os.environ:
            config.scopes = os.environ['SCOPES']

        return config


class ShopifyInitializer:
    """Initialize Shopify projects."""

    def __init__(self, config: EnvConfig):
        """
        Initialize ShopifyInitializer.

        Args:
            config: Environment configuration
        """
        self.config = config

    def prompt(self, message: str, default: Optional[str] = None) -> str:
        """
        Prompt user for input.

        Args:
            message: Prompt message
            default: Default value

        Returns:
            User input or default
        """
        if default:
            message = f"{message} [{default}]"
        user_input = input(f"{message}: ").strip()
        return user_input if user_input else (default or '')

    def select_option(self, message: str, options: List[str]) -> str:
        """
        Prompt user to select from options.

        Args:
            message: Prompt message
            options: List of options

        Returns:
            Selected option
        """
        print(f"\n{message}")
        for i, option in enumerate(options, 1):
            print(f"{i}. {option}")

        while True:
            try:
                choice = int(input("Select option: ").strip())
                if 1 <= choice <= len(options):
                    return options[choice - 1]
                print(f"Please select 1-{len(options)}")
            except ValueError:
                print("Invalid input")

    def check_cli_installed(self) -> bool:
        """
        Check if Shopify CLI is installed.

        Returns:
            True if installed, False otherwise
        """
        try:
            result = subprocess.run(
                ['shopify', 'version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.SubprocessError, FileNotFoundError):
            return False

    def create_app_config(self, project_dir: Path, app_name: str, scopes: str) -> None:
        """
        Create shopify.app.toml configuration file.

        Args:
            project_dir: Project directory
            app_name: Application name
            scopes: Access scopes
        """
        for value in (app_name, scopes, self.config.shopify_api_key or '', self.config.shop_domain or ''):
            if any(c in value for c in '\r\n"\\'):
                raise ValueError("Unsafe TOML string")
        config_content = f"""# Shopify App Configuration
name = "{app_name}"
client_id = "{self.config.shopify_api_key or 'YOUR_API_KEY'}"
application_url = "https://your-app.com"
embedded = true

[build]
automatically_update_urls_on_dev = true
dev_store_url = "{self.config.shop_domain or 'your-store.myshopify.com'}"

[access_scopes]
scopes = "{scopes}"

[webhooks]
api_version = "2026-01"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
uri = "/webhooks/app/uninstalled"

[[webhooks.subscriptions]]
compliance_topics = ["customers/data_request", "customers/redact", "shop/redact"]
uri = "/webhooks/privacy"
"""
        config_path = project_dir / 'shopify.app.toml'
        with config_path.open("x", encoding="utf-8") as output:
            output.write(config_content)
        print(f"✓ Created {config_path}")

    def create_extension_config(self, project_dir: Path, extension_name: str, extension_type: str) -> None:
        """
        Create shopify.extension.toml configuration file.

        Args:
            project_dir: Project directory
            extension_name: Extension name
            extension_type: Extension type
        """
        if not __import__('re').fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', extension_name):
            raise ValueError("Invalid extension name")
        if extension_type in ('function', 'theme_app'):
            raise ValueError("Use Shopify CLI to scaffold this extension type")
        target_map = {
            'checkout': 'purchase.checkout.block.render',
            'admin_action': 'admin.product-details.action.render',
            'admin_block': 'admin.product-details.block.render',
            'pos': 'pos.home.tile.render',
            'function': 'function',
            'customer_account': 'customer-account.order-status.block.render',
            'theme_app': 'theme-app-extension'
        }

        config_content = f"""api_version = "2026-01"

[[extensions]]
name = "{extension_name}"
type = "ui_extension"
handle = "{extension_name.lower().replace(' ', '-')}"

[[extensions.targeting]]
target = "{target_map.get(extension_type, 'purchase.checkout.block.render')}"

[extensions.capabilities]
network_access = false
api_access = false
"""
        config_path = project_dir / 'shopify.extension.toml'
        with config_path.open("x", encoding="utf-8") as output:
            output.write(config_content)
        print(f"✓ Created {config_path}")

    def create_readme(self, project_dir: Path, project_type: str, project_name: str) -> None:
        """
        Create README.md file.

        Args:
            project_dir: Project directory
            project_type: Project type (app/extension/theme)
            project_name: Project name
        """
        content = f"""# {project_name}

Shopify {project_type.capitalize()} project.

## Setup

```bash
# Install dependencies
npm install

# Start development
{('shopify theme dev' if project_type == 'theme' else 'shopify app dev')}
```

## Deployment

```bash
# Deploy to Shopify
{('shopify theme push --development' if project_type == 'theme' else 'shopify app deploy')}
```

## Resources

- [Shopify Documentation](https://shopify.dev/docs)
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli)
"""
        readme_path = project_dir / 'README.md'
        with readme_path.open("x", encoding="utf-8") as output:
            output.write(content)
        print(f"✓ Created {readme_path}")

    def init_app(self) -> None:
        """Initialize Shopify app project."""
        print("\n=== Shopify App Initialization ===\n")

        app_name = self.prompt("App name", "my-shopify-app")
        scopes = self.prompt("Access scopes", self.config.scopes or "read_products,write_products")

        project_dir = Path.cwd() / app_name
        if not __import__('re').fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', project_dir.name):
            raise ValueError("Use a lowercase alphanumeric/hyphen project name")
        if project_dir.parent != Path.cwd() or project_dir.name in ('.', '..'):
            raise ValueError("Project must be a direct child of the working directory")
        project_dir.mkdir(exist_ok=False)

        print(f"\nCreating app in {project_dir}...")

        self.create_app_config(project_dir, app_name, scopes)
        self.create_readme(project_dir, "app", app_name)

        # Create basic package.json
        package_json = {
            "name": app_name.lower().replace(' ', '-'),
            "version": "1.0.0",
            "scripts": {
                "dev": "shopify app dev",
                "deploy": "shopify app deploy"
            }
        }
        (project_dir / 'package.json').write_text(json.dumps(package_json, indent=2))
        print(f"✓ Created package.json")

        print(f"\n✓ App configuration sketch '{app_name}' written; no server scaffold was generated.")
        print(f"\nNext steps:")
        print(f"  cd {app_name}")
        print(f"  npm install")
        print(f"  shopify app dev")

    def init_extension(self) -> None:
        """Initialize Shopify extension project."""
        print("\n=== Shopify Extension Initialization ===\n")

        extension_types = [
            'checkout',
            'admin_action',
            'admin_block',
            'pos',
            'function',
            'customer_account',
            'theme_app'
        ]
        extension_type = self.select_option("Select extension type", extension_types)

        extension_name = self.prompt("Extension name", "my-extension")

        project_dir = Path.cwd() / extension_name
        if not __import__('re').fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', project_dir.name):
            raise ValueError("Use a lowercase alphanumeric/hyphen project name")
        if project_dir.parent != Path.cwd() or project_dir.name in ('.', '..'):
            raise ValueError("Project must be a direct child of the working directory")
        project_dir.mkdir(exist_ok=False)

        print(f"\nCreating extension in {project_dir}...")

        self.create_extension_config(project_dir, extension_name, extension_type)
        self.create_readme(project_dir, "extension", extension_name)

        print(f"\n✓ Extension configuration sketch '{extension_name}' written; generate real source with Shopify CLI inside an app.")
        print(f"\nNext steps:")
        print(f"  cd {extension_name}")
        print(f"  shopify app dev")

    def init_theme(self) -> None:
        """Initialize Shopify theme project."""
        print("\n=== Shopify Theme Initialization ===\n")

        theme_name = self.prompt("Theme name", "my-theme")

        print(f"\nInitializing theme '{theme_name}'...")
        print("\nRecommended: Use 'shopify theme init' for full theme scaffolding")
        print(f"\nRun: shopify theme init {theme_name}")

    def run(self) -> None:
        """Run interactive initialization."""
        print("=" * 60)
        print("Shopify Project Initializer")
        print("=" * 60)

        # Check CLI
        if not self.check_cli_installed():
            print("\n⚠ Shopify CLI not found!")
            print("Install: npm install -g @shopify/cli@latest")
            sys.exit(1)

        # Select project type
        project_types = ['app', 'extension', 'theme']
        project_type = self.select_option("Select project type", project_types)

        # Initialize based on type
        if project_type == 'app':
            self.init_app()
        elif project_type == 'extension':
            self.init_extension()
        elif project_type == 'theme':
            self.init_theme()


def main() -> None:
    """Main entry point."""
    try:
        # Get skill directory
        script_dir = Path(__file__).parent
        skill_dir = script_dir.parent

        # Load configuration
        config = EnvLoader.load_config(skill_dir)

        # Initialize project
        initializer = ShopifyInitializer(config)
        initializer.run()

    except KeyboardInterrupt:
        print("\n\nAborted.")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
