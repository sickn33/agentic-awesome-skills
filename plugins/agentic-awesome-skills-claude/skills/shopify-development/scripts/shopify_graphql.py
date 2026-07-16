#!/usr/bin/env python3
"""
Shopify GraphQL Utilities

Helper functions for common Shopify GraphQL operations.
Provides query templates, pagination helpers, and rate limit handling.

Usage:
    from shopify_graphql import ShopifyGraphQL

    client = ShopifyGraphQL(shop_domain, access_token)
    products = client.get_products(first=10)
"""

import os
import time
import json
from typing import Dict, List, Optional, Any, Generator
from dataclasses import dataclass
from urllib.request import Request, urlopen
from urllib.error import HTTPError


# API Configuration
API_VERSION = "2026-01"
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds


@dataclass
class GraphQLResponse:
    """Container for GraphQL response data."""
    data: Optional[Dict[str, Any]] = None
    errors: Optional[List[Dict[str, Any]]] = None
    extensions: Optional[Dict[str, Any]] = None

    @property
    def is_success(self) -> bool:
        return self.errors is None or len(self.errors) == 0

    @property
    def query_cost(self) -> Optional[int]:
        """Get the actual query cost from extensions."""
        if self.extensions and 'cost' in self.extensions:
            return self.extensions['cost'].get('actualQueryCost')
        return None


class ShopifyGraphQL:
    """
    Shopify GraphQL API client with built-in utilities.

    Features:
    - Query templates for common operations
    - Automatic pagination
    - Rate limit handling with exponential backoff
    - Response parsing helpers
    """

    def __init__(self, shop_domain: str, access_token: str):
        """
        Initialize the GraphQL client.

        Args:
            shop_domain: Store domain (e.g., 'my-store.myshopify.com')
            access_token: Admin API access token
        """
        self.shop_domain = shop_domain.replace('https://', '').replace('http://', '')
        self.access_token = access_token
        self.base_url = f"https://{self.shop_domain}/admin/api/{API_VERSION}/graphql.json"

    def execute(self, query: str, variables: Optional[Dict] = None) -> GraphQLResponse:
        """
        Execute a GraphQL query/mutation.

        Args:
            query: GraphQL query string
            variables: Query variables

        Returns:
            GraphQLResponse object
        """
        payload = {"query": query}
        if variables:
            payload["variables"] = variables

        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": self.access_token
        }

        for attempt in range(MAX_RETRIES):
            try:
                request = Request(
                    self.base_url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers=headers,
                    method='POST'
                )

                with urlopen(request, timeout=30) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    return GraphQLResponse(
                        data=result.get('data'),
                        errors=result.get('errors'),
                        extensions=result.get('extensions')
                    )

            except HTTPError as e:
                if e.code == 429:  # Rate limited
                    delay = RETRY_DELAY * (2 ** attempt)
                    print(f"Rate limited. Retrying in {delay}s...")
                    time.sleep(delay)
                    continue
                raise
            except Exception as e:
                if attempt == MAX_RETRIES - 1:
                    raise
                time.sleep(RETRY_DELAY)

        return GraphQLResponse(errors=[{"message": "Max retries exceeded"}])

    # ==================== Query Templates ====================

    def get_products(
        self,
        first: int = 10,
        query: Optional[str] = None,
        after: Optional[str] = None
    ) -> GraphQLResponse:
        """
        Query products with pagination.

        Args:
            first: Number of products to fetch (max 250)
            query: Optional search query
            after: Cursor for pagination
        """
        gql = """
        query GetProducts($first: Int!, $query: String, $after: String) {
            products(first: $first, query: $query, after: $after) {
                edges {
                    node {
                        id
                        title
                        handle
                        status
                        totalInventory
                        variants(first: 5) {
                            edges {
                                node {
                                    id
                                    title
                                    price
                                    inventoryQuantity
                                    sku
                                }
                            }
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
        """
        return self.execute(gql, {"first": first, "query": query, "after": after})

    def get_orders(
        self,
        first: int = 10,
        query: Optional[str] = None,
        after: Optional[str] = None
    ) -> GraphQLResponse:
        """
        Query orders with pagination.

        Args:
            first: Number of orders to fetch (max 250)
            query: Optional search query (e.g., "financial_status:paid")
            after: Cursor for pagination
        """
        gql = """
        query GetOrders($first: Int!, $query: String, $after: String) {
            orders(first: $first, query: $query, after: $after) {
                edges {
                    node {
                        id
                        name
                        createdAt
                        displayFinancialStatus
                        displayFulfillmentStatus
                        totalPriceSet {
                            shopMoney { amount currencyCode }
                        }
                        customer {
                            id
                            firstName
                            lastName
                        }
                        lineItems(first: 5) {
                            edges {
                                node {
                                    title
                                    quantity
                                }
                            }
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
        """
        return self.execute(gql, {"first": first, "query": query, "after": after})

    def get_customers(
        self,
        first: int = 10,
        query: Optional[str] = None,
        after: Optional[str] = None
    ) -> GraphQLResponse:
        """
        Query customers with pagination.

        Args:
            first: Number of customers to fetch (max 250)
            query: Optional search query
            after: Cursor for pagination
        """
        gql = """
        query GetCustomers($first: Int!, $query: String, $after: String) {
            customers(first: $first, query: $query, after: $after) {
                edges {
                    node {
                        id
                        firstName
                        lastName
                        displayName
                        defaultEmailAddress {
                            emailAddress
                        }
                        numberOfOrders
                        amountSpent {
                            amount
                            currencyCode
                        }
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
        """
        return self.execute(gql, {"first": first, "query": query, "after": after})

    def set_metafields(self, metafields: List[Dict]) -> GraphQLResponse:
        """
        Set metafields on resources.

        Args:
            metafields: List of metafield inputs, each containing:
                - ownerId: Resource GID
                - namespace: Metafield namespace
                - key: Metafield key
                - value: Metafield value
                - type: Metafield type
        """
        gql = """
        mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
                metafields {
                    id
                    namespace
                    key
                    value
                }
                userErrors {
                    field
                    message
                }
            }
        }
        """
        return self.execute(gql, {"metafields": metafields})

    # ==================== Pagination Helpers ====================

    def paginate_products(
        self,
        batch_size: int = 50,
        query: Optional[str] = None
    ) -> Generator[Dict, None, None]:
        """
        Generator that yields all products with automatic pagination.

        Args:
            batch_size: Products per request (max 250)
            query: Optional search query

        Yields:
            Product dictionaries
        """
        cursor = None
        while True:
            response = self.get_products(first=batch_size, query=query, after=cursor)

            if not response.is_success or not response.data:
                break

            products = response.data.get('products', {})
            edges = products.get('edges', [])

            for edge in edges:
                yield edge['node']

            page_info = products.get('pageInfo', {})
            if not page_info.get('hasNextPage'):
                break

            cursor = page_info.get('endCursor')

    def paginate_orders(
        self,
        batch_size: int = 50,
        query: Optional[str] = None
    ) -> Generator[Dict, None, None]:
        """
        Generator that yields all orders with automatic pagination.

        Args:
            batch_size: Orders per request (max 250)
            query: Optional search query

        Yields:
            Order dictionaries
        """
        cursor = None
        while True:
            response = self.get_orders(first=batch_size, query=query, after=cursor)

            if not response.is_success or not response.data:
                break

            orders = response.data.get('orders', {})
            edges = orders.get('edges', [])

            for edge in edges:
                yield edge['node']

            page_info = orders.get('pageInfo', {})
            if not page_info.get('hasNextPage'):
                break

            cursor = page_info.get('endCursor')


# ==================== Utility Functions ====================

def extract_id(gid: str) -> str:
    """
    Extract numeric ID from Shopify GID.

    Args:
        gid: Global ID (e.g., 'gid://shopify/Product/123')

    Returns:
        Numeric ID string (e.g., '123')
    """
    return gid.split('/')[-1] if gid else ''


def build_gid(resource_type: str, id: str) -> str:
    """
    Build Shopify GID from resource type and ID.

    Args:
        resource_type: Resource type (e.g., 'Product', 'Order')
        id: Numeric ID

    Returns:
        Global ID (e.g., 'gid://shopify/Product/123')
    """
    return f"gid://shopify/{resource_type}/{id}"


# ==================== Example Usage ====================

def main():
    """Example usage of ShopifyGraphQL client."""
    import os

    # Load from environment
    shop = os.environ.get('SHOP_DOMAIN', 'your-store.myshopify.com')
    token = os.environ.get('SHOPIFY_ACCESS_TOKEN', '')

    if not token:
        print("Set SHOPIFY_ACCESS_TOKEN environment variable")
        return

    client = ShopifyGraphQL(shop, token)

    # Example: Get first 5 products
    print("Fetching products...")
    response = client.get_products(first=5)

    if response.is_success:
        products = response.data['products']['edges']
        for edge in products:
            product = edge['node']
            print(f"  - {product['title']} ({product['status']})")
        print(f"\nQuery cost: {response.query_cost}")
    else:
        print(f"Errors: {response.errors}")


if __name__ == '__main__':
    main()
