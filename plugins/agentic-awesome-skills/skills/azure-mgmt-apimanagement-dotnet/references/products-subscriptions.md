# Products and Subscriptions

Patterns for managing products, subscriptions, and access control.

## Create Product

```csharp
var productData = new ApiManagementProductData
{
    DisplayName = "Premium",
    Description = "Premium tier with full access",
    IsSubscriptionRequired = true,
    IsApprovalRequired = true,  // Requires admin approval
    SubscriptionsLimit = 5,
    State = ApiManagementProductState.NotPublished,
    Terms = "Terms and conditions for premium tier..."
};

var product = await service.GetApiManagementProducts()
    .CreateOrUpdateAsync(WaitUntil.Completed, "premium", productData);
```

## List Products

```csharp
await foreach (var product in service.GetApiManagementProducts())
{
    Console.WriteLine($"{product.Data.DisplayName}: {product.Data.State}");
}
```

## Add API to Product

```csharp
// Get product
var product = await service.GetApiManagementProductAsync("premium");

// Add API
await product.Value.GetProductApis()
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-api");
```

## Remove API from Product

```csharp
var productApi = await product.Value.GetProductApiAsync("my-api");
await productApi.Value.DeleteAsync(WaitUntil.Completed);
```

## List APIs in Product

```csharp
await foreach (var api in product.Value.GetProductApis())
{
    Console.WriteLine($"  - {api.Data.DisplayName}");
}
```

## Create Subscription

```csharp
// Subscription to product
var subscriptionData = new ApiManagementSubscriptionCreateOrUpdateContent
{
    DisplayName = "Customer A Subscription",
    Scope = $"/products/premium",
    State = ApiManagementSubscriptionState.Active,
    AllowTracing = false
};

var subscription = await service.GetApiManagementSubscriptions()
    .CreateOrUpdateAsync(WaitUntil.Completed, "customer-a-sub", subscriptionData);

// Subscription to specific API
var apiSubscriptionData = new ApiManagementSubscriptionCreateOrUpdateContent
{
    DisplayName = "API-specific Subscription",
    Scope = $"/apis/my-api",
    State = ApiManagementSubscriptionState.Active
};
```

## Get Subscription Keys

```csharp
var secrets = await subscription.Value.GetSecretsAsync();
// Store returned secrets privately; never print primary or secondary keys.
```

## Regenerate Subscription Keys

```csharp
// Regenerate primary key
await subscription.Value.RegeneratePrimaryKeyAsync();

// Regenerate secondary key
await subscription.Value.RegenerateSecondaryKeyAsync();
```

## List Subscriptions

```csharp
await foreach (var sub in service.GetApiManagementSubscriptions())
{
    Console.WriteLine($"{sub.Data.DisplayName}: {sub.Data.State}");
}
```

## Suspend/Activate Subscription

```csharp
// Suspend
var patch = new ApiManagementSubscriptionPatch
{
    State = ApiManagementSubscriptionState.Suspended
};
var currentTag = await subscription.Value.GetEntityTagAsync();
await subscription.Value.UpdateAsync(currentTag.Value, patch);

// Reactivate
patch.State = ApiManagementSubscriptionState.Active;
currentTag = await subscription.Value.GetEntityTagAsync();
await subscription.Value.UpdateAsync(currentTag.Value, patch);
```

## Create User

```csharp
var userData = new ApiManagementUserCreateOrUpdateContent
{
    Email = "user@contoso.com",
    FirstName = "John",
    LastName = "Doe",
    State = ApiManagementUserState.Active,
    // Use the approved invitation/identity flow; do not embed a password.
};

var user = await service.GetApiManagementUsers()
    .CreateOrUpdateAsync(WaitUntil.Completed, "john-doe", userData);
```

## Create Group

```csharp
var groupData = new ApiManagementGroupCreateOrUpdateContent
{
    DisplayName = "Premium Users",
    Description = "Users with premium access",
    GroupContractType = ApiManagementGroupType.Custom
};

var group = await service.GetApiManagementGroups()
    .CreateOrUpdateAsync(WaitUntil.Completed, "premium-users", groupData);
```

## Add User to Group

```csharp
await group.Value.GetGroupUsers()
    .CreateOrUpdateAsync(WaitUntil.Completed, "john-doe");
```

## Add Group to Product

```csharp
await product.Value.GetProductGroups()
    .CreateOrUpdateAsync(WaitUntil.Completed, "premium-users");
```

## Delete Subscription

```csharp
var deleteTag = await subscription.Value.GetEntityTagAsync();
await subscription.Value.DeleteAsync(WaitUntil.Completed, deleteTag.Value);
```
