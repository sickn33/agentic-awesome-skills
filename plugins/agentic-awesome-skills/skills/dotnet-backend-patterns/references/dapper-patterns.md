# Dapper Patterns and Best Practices

Advanced patterns for high-performance data access with Dapper in .NET.

## Why Dapper?

| Aspect | Dapper | EF Core |
|--------|--------|---------|
| Performance | ~10x faster for simple queries | Good with optimization |
| Control | Full SQL control | Abstracted |
| Learning curve | Low (just SQL) | Higher |
| Complex mappings | Manual | Automatic |
| Change tracking | None | Built-in |
| Migrations | External tools | Built-in |

**Use Dapper when:**
- Performance is critical (hot paths)
- You need complex SQL (CTEs, window functions)
- Read-heavy workloads
- Legacy database schemas

**Use EF Core when:**
- Rich domain models with relationships
- Need change tracking
- Want LINQ-to-SQL translation
- Complex object graphs

## Connection Management

### 1. Proper Connection Handling

```csharp
// Register connection factory
services.AddScoped<IDbConnection>(sp =>
{
    var connectionString = sp.GetRequiredService<IConfiguration>()
        .GetConnectionString("Default");
    return new SqlConnection(connectionString);
});

// Or use a factory for more control
public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}

public class SqlConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Connection string not found");
    }

    public IDbConnection CreateConnection() => new SqlConnection(_connectionString);
}
```

### 2. Connection Lifecycle

```csharp
public class ProductRepository
{
    private readonly IDbConnectionFactory _factory;

    public ProductRepository(IDbConnectionFactory factory)
    {
        _factory = factory;
    }

    public async Task<Product?> GetByIdAsync(string id, CancellationToken ct)
    {
        // Connection opens automatically, closes on dispose
        using var connection = _factory.CreateConnection();
        
        return await connection.QueryFirstOrDefaultAsync<Product>(
            new CommandDefinition(
                "SELECT * FROM Products WHERE Id = @Id",
                new { Id = id },
                cancellationToken: ct));
    }
}
```

## Query Patterns

### 3. Basic CRUD Operations

```csharp
// SELECT single
var product = await connection.QueryFirstOrDefaultAsync<Product>(
    "SELECT * FROM Products WHERE Id = @Id",
    new { Id = id });

// SELECT multiple
var products = await connection.QueryAsync<Product>(
    "SELECT * FROM Products WHERE CategoryId = @CategoryId",
    new { CategoryId = categoryId });

// INSERT with identity return
var newId = await connection.QuerySingleAsync<int>(
    """
    INSERT INTO Products (Name, Price, CategoryId)
    VALUES (@Name, @Price, @CategoryId);
    SELECT CAST(SCOPE_IDENTITY() AS INT);
    """,
    product);

// INSERT with OUTPUT clause (returns full entity)
var inserted = await connection.QuerySingleAsync<Product>(
    """
    INSERT INTO Products (Name, Price, CategoryId)
    OUTPUT INSERTED.*
    VALUES (@Name, @Price, @CategoryId);
    """,
    product);

// UPDATE
var rowsAffected = await connection.ExecuteAsync(
    """
    UPDATE Products 
    SET Name = @Name, Price = @Price, UpdatedAt = @UpdatedAt
    WHERE Id = @Id
    """,
    new { product.Id, product.Name, product.Price, UpdatedAt = DateTime.UtcNow });

// DELETE
await connection.ExecuteAsync(
    "DELETE FROM Products WHERE Id = @Id",
    new { Id = id });
```

### 4. Dynamic Query Building

```csharp
public async Task<IReadOnlyList<Product>> SearchAsync(ProductSearchCriteria criteria)
{
    var sql = new StringBuilder("SELECT * FROM Products WHERE 1=1");
    var parameters = new DynamicParameters();

    if (!string.IsNullOrWhiteSpace(criteria.SearchTerm))
    {
        sql.Append(" AND (Name LIKE @SearchTerm OR Sku LIKE @SearchTerm)");
        parameters.Add("SearchTerm", $"%{criteria.SearchTerm}%");
    }

    if (criteria.CategoryId.HasValue)
    {
        sql.Append(" AND CategoryId = @CategoryId");
        parameters.Add("CategoryId", criteria.CategoryId.Value);
    }

    if (criteria.MinPrice.HasValue)
    {
        sql.Append(" AND Price >= @MinPrice");
        parameters.Add("MinPrice", criteria.MinPrice.Value);
    }

    if (criteria.MaxPrice.HasValue)
    {
        sql.Append(" AND Price <= @MaxPrice");
        parameters.Add("MaxPrice", criteria.MaxPrice.Value);
    }

    // Pagination
    sql.Append(" ORDER BY Name");
    sql.Append(" OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY");
    parameters.Add("Offset", (criteria.Page - 1) * criteria.PageSize);
    parameters.Add("PageSize", criteria.PageSize);

    using var connection = _factory.CreateConnection();
    var results = await connection.QueryAsync<Product>(sql.ToString(), parameters);
    return results.ToList();
}
```

### 5. Multi-Mapping (Joins)

```csharp
// One-to-One mapping
public async Task<Product?> GetProductWithCategoryAsync(string id)
{
    const string sql = """
        SELECT p.*, c.*
        FROM Products p
        INNER JOIN Categories c ON p.CategoryId = c.Id
        WHERE p.Id = @Id
        """;

    using var connection = _factory.CreateConnection();
    
    var result = await connection.QueryAsync<Product, Category, Product>(
        sql,
        (product, category) =>
        {
            product.Category = category;
            return product;
        },
        new { Id = id },
        splitOn: "Id");  // Column where split occurs

    return result.FirstOrDefault();
}

// One-to-Many mapping
public async Task<Order?> GetOrderWithItemsAsync(int orderId)
{
    const string sql = """
        SELECT o.*, oi.*, p.*
        FROM Orders o
        LEFT JOIN OrderItems oi ON o.Id = oi.OrderId
        LEFT JOIN Products p ON oi.ProductId = p.Id
        WHERE o.Id = @OrderId
        """;

    var orderDictionary = new Dictionary<int, Order>();

    using var connection = _factory.CreateConnection();
    
    await connection.QueryAsync<Order, OrderItem, Product, Order>(
        sql,
        (order, item, product) =>
        {
            if (!orderDictionary.TryGetValue(order.Id, out var existingOrder))
            {
                existingOrder = order;
                existingOrder.Items = new List<OrderItem>();
                orderDictionary.Add(order.Id, existingOrder);
            }

            if (item != null)
            {
                item.Product = product;
                existingOrder.Items.Add(item);
            }

            return existingOrder;
        },
        new { OrderId = orderId },
        splitOn: "Id,Id");

    return orderDictionary.Values.FirstOrDefault();
}
```

### 6. Multiple Result Sets

```csharp
public async Task<(IReadOnlyList<Product> Products, int TotalCount)> SearchWithCountAsync(
    ProductSearchCriteria criteria)
{
    const string sql = """
        -- First result set: count
        SELECT COUNT(*) FROM Products WHERE CategoryId = @CategoryId;
        
        -- Second result set: data
        SELECT * FROM Products 
        WHERE CategoryId = @CategoryId
        ORDER BY Name
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
        """;

    using var connection = _factory.CreateConnection();
    using var multi = await connection.QueryMultipleAsync(sql, new
    {
        CategoryId = criteria.CategoryId,
        Offset = (criteria.Page - 1) * criteria.PageSize,
        PageSize = criteria.PageSize
    });

    var totalCount = await multi.ReadSingleAsync<int>();
    var products = (await multi.ReadAsync<Product>()).ToList();

    return (products, totalCount);
}
```

## Advanced Patterns

### 7. Table-Valued Parameters (Bulk Operations)

```csharp
// SQL Server TVP for bulk operations
public async Task<IReadOnlyList<Product>> GetByIdsAsync(IEnumerable<string> ids)
{
    // Create DataTable matching TVP structure
    var table = new DataTable();
    table.Columns.Add("Id", typeof(string));
    
    foreach (var id in ids)
    {
        table.Rows.Add(id);
    }

    using var connection = _factory.CreateConnection();
    
    var results = await connection.QueryAsync<Product>(
        "SELECT p.* FROM Products p INNER JOIN @Ids i ON p.Id = i.Id",
        new { Ids = table.AsTableValuedParameter("dbo.StringIdList") });

    return results.ToList();
}

// SQL to create the TVP type:
// CREATE TYPE dbo.StringIdList AS TABLE (Id NVARCHAR(40));
```

### 8. Stored Procedures

```csharp
public async Task<IReadOnlyList<Product>> GetTopProductsAsync(int categoryId, int count)
{
    using var connection = _factory.CreateConnection();
    
    var results = await connection.QueryAsync<Product>(
        "dbo.GetTopProductsByCategory",
        new { CategoryId = categoryId, TopN = count },
        commandType: CommandType.StoredProcedure);

    return results.ToList();
}

// With output parameters
public async Task<(Order Order, string ConfirmationCode)> CreateOrderAsync(Order order)
{
    var parameters = new DynamicParameters(new
    {
        order.CustomerId,
        order.Total
    });
    parameters.Add("OrderId", dbType: DbType.Int32, direction: ParameterDirection.Output);
    parameters.Add("ConfirmationCode", dbType: DbType.String, size: 20, direction: ParameterDirection.Output);

    using var connection = _factory.CreateConnection();
    
    await connection.ExecuteAsync(
        "dbo.CreateOrder",
        parameters,
        commandType: CommandType.StoredProcedure);

    order.Id = parameters.Get<int>("OrderId");
    var confirmationCode = parameters.Get<string>("ConfirmationCode");

    return (order, confirmationCode);
}
```

### 9. Transactions

```csharp
public async Task<Order> CreateOrderWithItemsAsync(Order order, List<OrderItem> items)
{
    using var connection = _factory.CreateConnection();
    await connection.OpenAsync();
    
    using var transaction = await connection.BeginTransactionAsync();
    
    try
    {
        // Insert order
        order.Id = await connection.QuerySingleAsync<int>(
            """
            INSERT INTO Orders (CustomerId, Total, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES (@CustomerId, @Total, @CreatedAt)
            """,
            order,
            transaction);

        // Insert items
        foreach (var item in items)
        {
            item.OrderId = order.Id;
        }

        await connection.ExecuteAsync(
            """
            INSERT INTO OrderItems (OrderId, ProductId, Quantity, UnitPrice)
            VALUES (@OrderId, @ProductId, @Quantity, @UnitPrice)
            """,
            items,
            transaction);

        await transaction.CommitAsync();
        
        order.Items = items;
        return order;
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

### 10. Custom Type Handlers

```csharp
// Register custom type handler for JSON columns
public class JsonTypeHandler<T> : SqlMapper.TypeHandler<T>
{
    public override T Parse(object value)
    {
        if (value is string json)
        {
            return JsonSerializer.Deserialize<T>(json)!;
        }
        return default!;
    }

    public override void SetValue(IDbDataParameter parameter, T value)
    {
        parameter.Value = JsonSerializer.Serialize(value);
        parameter.DbType = DbType.String;
    }
}

// Register at startup
SqlMapper.AddTypeHandler(new JsonTypeHandler<ProductMetadata>());

// Now you can query directly
var product = await connection.QueryFirstAsync<Product>(
    "SELECT Id, Name, Metadata FROM Products WHERE Id = @Id",
    new { Id = id });
// product.Metadata is automatically deserialized from JSON
```

## Performance Tips

### 11. Use CommandDefinition for Cancellation

```csharp
// Always use CommandDefinition for async operations
var result = await connection.QueryAsync<Product>(
    new CommandDefinition(
        commandText: "SELECT * FROM Products WHERE CategoryId = @CategoryId",
        parameters: new { CategoryId = categoryId },
        cancellationToken: ct,
        commandTimeout: 30));
```

### 12. Buffered vs Unbuffered Queries

```csharp
// Buffered (default) - loads all results into memory
var products = await connection.QueryAsync<Product>(sql);  // Returns list

// Unbuffered - streams results (lower memory for large result sets)
var products = await connection.QueryUnbufferedAsync<Product>(sql);  // Returns IAsyncEnumerable

await foreach (var product in products)
{
    // Process one at a time
}
```

### 13. Connection Pooling Settings

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=MyDb;User Id=sa;Password=xxx;TrustServerCertificate=True;Min Pool Size=5;Max Pool Size=100;Connection Timeout=30;"
  }
}
```

## Common Patterns

### Repository Base Class

```csharp
public abstract class DapperRepositoryBase<T> where T : class
{
    protected readonly IDbConnectionFactory ConnectionFactory;
    protected readonly ILogger Logger;
    protected abstract string TableName { get; }

    protected DapperRepositoryBase(IDbConnectionFactory factory, ILogger logger)
    {
        ConnectionFactory = factory;
        Logger = logger;
    }

    protected async Task<T?> GetByIdAsync<TId>(TId id, CancellationToken ct = default)
    {
        var sql = $"SELECT * FROM {TableName} WHERE Id = @Id";
        
        using var connection = ConnectionFactory.CreateConnection();
        return await connection.QueryFirstOrDefaultAsync<T>(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    protected async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default)
    {
        var sql = $"SELECT * FROM {TableName}";
        
        using var connection = ConnectionFactory.CreateConnection();
        var results = await connection.QueryAsync<T>(
            new CommandDefinition(sql, cancellationToken: ct));
        
        return results.ToList();
    }

    protected async Task<int> ExecuteAsync(
        string sql, 
        object? parameters = null, 
        CancellationToken ct = default)
    {
        using var connection = ConnectionFactory.CreateConnection();
        return await connection.ExecuteAsync(
            new CommandDefinition(sql, parameters, cancellationToken: ct));
    }
}
```

## Anti-Patterns to Avoid

```csharp
// ❌ Bad - SQL injection risk
var sql = $"SELECT * FROM Products WHERE Name = '{userInput}'";

// ✅ Good - Parameterized query
var sql = "SELECT * FROM Products WHERE Name = @Name";
await connection.QueryAsync<Product>(sql, new { Name = userInput });

// ❌ Bad - Not disposing connection
var connection = new SqlConnection(connectionString);
var result = await connection.QueryAsync<Product>(sql);
// Connection leak!

// ✅ Good - Using statement
using var connection = new SqlConnection(connectionString);
var result = await connection.QueryAsync<Product>(sql);

// ❌ Bad - Opening connection manually when not needed
await connection.OpenAsync();  // Dapper does this automatically
var result = await connection.QueryAsync<Product>(sql);

// ✅ Good - Let Dapper manage connection
var result = await connection.QueryAsync<Product>(sql);
```
