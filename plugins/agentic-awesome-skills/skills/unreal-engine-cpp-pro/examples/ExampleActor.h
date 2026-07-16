#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ExampleActor.generated.h"

// Forward overrides to reduce compile times
class UBoxComponent;

/**
 * AExampleActor
 * 
 * Demonstrates:
 * 1. Correct class prefix (A)
 * 2. UPROPERTY usage
 * 3. Soft references for assets
 */
UCLASS()
class MYGAME_API AExampleActor : public AActor
{
    GENERATED_BODY()
    
public:    
    // Sets default values for this actor's properties
    AExampleActor();

protected:
    // Called when the game starts or when spawned
    virtual void BeginPlay() override;
    
    // Called when the game ends
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

public:    
    // Called every frame
    virtual void Tick(float DeltaTime) override;

    /** Component exposed to Blueprint, but immutable logic in C++ */
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
    UBoxComponent* RootCollision;

    /** 
     * Soft reference to an actor class to lazy load.
     * Prevents hard reference chains.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Config")
    TSoftClassPtr<AActor> ActorTypeToSpawn;

    /** Proper boolean naming convention 'b' */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "State")
    uint8 bIsActive:1;

private:
    /** Cached reference, not exposed to Blueprints */
    UPROPERTY(Transient)
    APlayerController* CachedPC;
};
