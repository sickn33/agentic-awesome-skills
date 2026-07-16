// Repository Implementation Template for .NET 8+
// Demonstrates both Dapper (performance) and EF Core (convenience) patterns

using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace YourNamespace.Infrastructure.Data;

#region Interfaces

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default);
    Task<(IReadOnlyList<Product> Items, int TotalCount)> SearchAsync(ProductSearchRequest request, CancellationToken ct = default);
    Task<Product> CreateAsync(Product product, CancellationToken ct = default);
    Task<Product> UpdateAsync(Product product, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
    Task<IReadOnlyList<Product>> GetByIdsAsync(IEnumerable<string> ids, CancellationToken ct = default);
}

#endregion

#region Dapper Implementation (High Performance)

public class DapperProductRepository : IProductRepository
{
    private readonly IDbConnection _connection;
    private readonly ILogger<DapperProductRepository> _logger;

    public DapperProductRepository(
        IDbConnection connection,
        ILogger<DapperProductRepository> logger)
    {
        _connection = connection;
        _logger = logger;
    }

    public async Task<Product?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        const string sql = """
            SELECT Id, Name, Sku, Price, CategoryId, Stock, CreatedAt, UpdatedAt
            FROM Products
            WHERE Id = @Id AND IsDeleted = 0
            """;

        return await _connection.QueryFirstOrDefaultAsync<Product>(
            new CommandDefinition(sql, new { Id = id }, cancellationToken: ct));
    }

    public async Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
    {
        const string sql = """
            SELECT Id, Name, Sku, Price, CategoryId, Stock, CreatedAt, UpdatedAt
            FROM Products
            WHERE Sku = @Sku AND IsDeleted = 0
            """;

        return await _connection.QueryFirstOrDefaultAsync<Product>(
            new CommandDefinition(sql, new { Sku = sku }, cancellationToken: ct));
    }

    public async Task<(IReadOnlyList<Product> Items, int TotalCount)> SearchAsync(
        ProductSearchRequest request, 
        CancellationToken ct = default)
    {
        var whereClauses = new List<string> { "IsDeleted = 0" };
        var parameters = new DynamicParameters();

        // Build dynamic WHERE clause
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            whereClauses.Add("(Name LIKE @SearchTerm OR Sku LIKE @SearchTerm)");
            parameters.Add("SearchTerm", $"%{request.SearchTerm}%");
        }

        if (request.CategoryId.HasValue)
        {
            whereClauses.Add("CategoryId = @CategoryId");
            parameters.Add("CategoryId", request.CategoryId.Value);
        }

        if (request.MinPrice.HasValue)
        {
            whereClauses.Add("Price >= @MinPrice");
            parameters.Add("MinPrice", request.MinPrice.Value);
        }

        if (request.MaxPrice.HasValue)
        {
            whereClauses.Add("Price <= @MaxPrice");
            parameters.Add("MaxPrice", request.MaxPrice.Value);
        }

        var whereClause = string.Join(" AND ", whereClauses);
        var page = request.Page ?? 1;
        var pageSize = request.PageSize ?? 50;
        var offset = (page - 1) * pageSize;

        parameters.Add("Offset", offset);
        parameters.Add("PageSize", pageSize);

        // Use multi-query for count + data in single roundtrip
        var sql = $"""
            -- Count query
            SELECT COUNT(*) FROM Products WHERE {whereClause};
            
            -- Data query with pagination
            SELECT Id, Name, Sku, Price, CategoryId, Stock, CreatedAt, UpdatedAt
            FROM Products
            WHERE {whereClause}
            ORDER BY Name
            OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
            """;

        using var multi = await _connection.QueryMultipleAsync(
            new CommandDefinition(sql, parameters, cancellationToken: ct));

        var totalCount = await multi.ReadSingleAsync<int>();
        var items = (await multi.ReadAsync<Product>()).ToList();

        return (items, totalCount);
    }

    public async Task<Product> CreateAsync(Product product, CancellationToken ct = default)
    {
        const string sql = """
            INSERT INTO Products (Id, Name, Sku, Price, CategoryId, Stock, CreatedAt, IsDeleted)
            VALUES (@Id, @Name, @Sku, @Price, @CategoryId, @Stock, @CreatedAt, 0);
            
            SELECT Id, Name, Sku, Price, CategoryId, Stock, CreatedAt, UpdatedAt
            FROM Products WHERE Id = @Id;
            """;

        return await _connection.QuerySingleAsync<Product>(
            new CommandDefinition(sql, product, cancellationToken: ct));
    }

    public async Task<Product> UpdateAsync(Product product, CancellationToken ct = default)
    {
        const string sql = """
            UPDATE Products
            SET Name = @Name,
                Sku = @Sku,
                Price = @Price,
                CategoryId = @CategoryId,
                Stock = @Stock,
                UpdatedAt = @UpdatedAt
            WHERE Id = @Id AND IsDeleted = 0;
            
            SELECT Id, Name, Sku, Price, CategoryId, Stock, CreatedAt, UpdatedAt
            FROM Products WHERE Id = @Id;
            """;

        return await _connection.QuerySingleAsync<Product>(
            new CommandDefinition(sql, product, cancellationToken: ct));
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        const string sql = """
            UPDATE Products
            SET IsDeleted = 1, UpdatedAt = @UpdatedAt
            WHERE Id = @Id
            """;

        await _connection.ExecuteAsync(
            new CommandDefinition(sql, new { Id = id, UpdatedAt = DateTime.UtcNow }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<Product>> GetByIdsAsync(
        IEnumerable<string> ids, 
        CancellationToken ct = default)
    {
        var idList = ids.ToList();
        if (idList.Count == 0)
            return Array.Empty<Product>();

        const string sql = """
            SELECT Id, Name, Sku, Price, CategoryId, Stock, CreatedAt, UpdatedAt
            FROM Products
            WHERE Id IN @Ids AND IsDeleted = 0
            """;

        var results = await _connection.QueryAsync<Product>(
            new CommandDefinition(sql, new { Ids = idList }, cancellationToken: ct));

        return results.ToList();
    }
}

#endregion

#region EF Core Implementation (Rich Domain Models)

public class EfCoreProductRepository : IProductRepository
{
    private readonly AppDbContext _context;
    private readonly ILogger<EfCoreProductRepository> _logger;

    public EfCoreProductRepository(
        AppDbContext context,
        ILogger<EfCoreProductRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Product?> GetByIdAsync(string id, CancellationToken ct = default)
    {
        return await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct);
    }

    public async Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
    {
        return await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Sku == sku, ct);
    }

    public async Task<(IReadOnlyList<Product> Items, int TotalCount)> SearchAsync(
        ProductSearchRequest request, 
        CancellationToken ct = default)
    {
        var query = _context.Products.AsNoTracking();

        // Apply filters
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.ToLower();
            query = query.Where(p => 
                p.Name.ToLower().Contains(term) || 
                p.Sku.ToLower().Contains(term));
        }

        if (request.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);

        if (request.MinPrice.HasValue)
            query = query.Where(p => p.Price >= request.MinPrice.Value);

        if (request.MaxPrice.HasValue)
            query = query.Where(p => p.Price <= request.MaxPrice.Value);

        // Get count before pagination
        var totalCount = await query.CountAsync(ct);

        // Apply pagination
        var page = request.Page ?? 1;
        var pageSize = request.PageSize ?? 50;

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<Product> CreateAsync(Product product, CancellationToken ct = default)
    {
        _context.Products.Add(product);
        await _context.SaveChangesAsync(ct);
        return product;
    }

    public async Task<Product> UpdateAsync(Product product, CancellationToken ct = default)
    {
        _context.Products.Update(product);
        await _context.SaveChangesAsync(ct);
        return product;
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        var product = await _context.Products.FindAsync(new object[] { id }, ct);
        if (product != null)
        {
            product.IsDeleted = true;
            product.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<Product>> GetByIdsAsync(
        IEnumerable<string> ids, 
        CancellationToken ct = default)
    {
        var idList = ids.ToList();
        if (idList.Count == 0)
            return Array.Empty<Product>();

        return await _context.Products
            .AsNoTracking()
            .Where(p => idList.Contains(p.Id))
            .ToListAsync(ct);
    }
}

#endregion

#region DbContext Configuration

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all configurations from assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global query filter for soft delete
        modelBuilder.Entity<Product>().HasQueryFilter(p => !p.IsDeleted);
    }
}

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasMaxLength(40);

        builder.Property(p => p.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(p => p.Sku)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(p => p.Price)
            .HasPrecision(18, 2);

        // Indexes
        builder.HasIndex(p => p.Sku).IsUnique();
        builder.HasIndex(p => p.CategoryId);
        builder.HasIndex(p => new { p.CategoryId, p.Name });

        // Relationships
        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId);
    }
}

#endregion

#region Advanced Patterns

/// <summary>
/// Unit of Work pattern for coordinating multiple repositories
/// </summary>
public interface IUnitOfWork : IDisposable
{
    IProductRepository Products { get; }
    IOrderRepository Orders { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IDbContextTransaction? _transaction;

    public IProductRepository Products { get; }
    public IOrderRepository Orders { get; }

    public UnitOfWork(
        AppDbContext context,
        IProductRepository products,
        IOrderRepository orders)
    {
        _context = context;
        Products = products;
        Orders = orders;
    }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        _transaction = await _context.Database.BeginTransactionAsync(ct);
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_transaction != null)
        {
            await _transaction.CommitAsync(ct);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public async Task RollbackAsync(CancellationToken ct = default)
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync(ct);
            await _transaction.DisposeAsync();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}

/// <summary>
/// Specification pattern for complex queries
/// </summary>
public interface ISpecification<T>
{
    Expression<Func<T, bool>> Criteria { get; }
    List<Expression<Func<T, object>>> Includes { get; }
    List<string> IncludeStrings { get; }
    Expression<Func<T, object>>? OrderBy { get; }
    Expression<Func<T, object>>? OrderByDescending { get; }
    int? Take { get; }
    int? Skip { get; }
}

public abstract class BaseSpecification<T> : ISpecification<T>
{
    public Expression<Func<T, bool>> Criteria { get; private set; } = _ => true;
    public List<Expression<Func<T, object>>> Includes { get; } = new();
    public List<string> IncludeStrings { get; } = new();
    public Expression<Func<T, object>>? OrderBy { get; private set; }
    public Expression<Func<T, object>>? OrderByDescending { get; private set; }
    public int? Take { get; private set; }
    public int? Skip { get; private set; }

    protected void AddCriteria(Expression<Func<T, bool>> criteria) => Criteria = criteria;
    protected void AddInclude(Expression<Func<T, object>> include) => Includes.Add(include);
    protected void AddInclude(string include) => IncludeStrings.Add(include);
    protected void ApplyOrderBy(Expression<Func<T, object>> orderBy) => OrderBy = orderBy;
    protected void ApplyOrderByDescending(Expression<Func<T, object>> orderBy) => OrderByDescending = orderBy;
    protected void ApplyPaging(int skip, int take) { Skip = skip; Take = take; }
}

// Example specification
public class ProductsByCategorySpec : BaseSpecification<Product>
{
    public ProductsByCategorySpec(int categoryId, int page, int pageSize)
    {
        AddCriteria(p => p.CategoryId == categoryId);
        AddInclude(p => p.Category);
        ApplyOrderBy(p => p.Name);
        ApplyPaging((page - 1) * pageSize, pageSize);
    }
}

#endregion

#region Entity Definitions

public class Product
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    public int Stock { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Category? Category { get; set; }
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ICollection<Product> Products { get; set; } = new List<Product>();
}

public class Order
{
    public int Id { get; set; }
    public string CustomerOrderCode { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string ProductId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }

    public Order? Order { get; set; }
    public Product? Product { get; set; }
}

#endregion
