#include "ExampleActor.h"
#include "Components/BoxComponent.h"
#include "Kismet/GameplayStatics.h"

// Define a static log category for this specific file/module
DEFINE_LOG_CATEGORY_STATIC(LogExampleActor, Log, All);

AExampleActor::AExampleActor()
{
    // Default to strict settings
    PrimaryActorTick.bCanEverTick = false; 
    PrimaryActorTick.bStartWithTickEnabled = false;

    RootCollision = CreateDefaultSubobject<UBoxComponent>(TEXT("RootCollision"));
    RootComponent = RootCollision;
    
    bIsActive = true;
}

void AExampleActor::BeginPlay()
{
    Super::BeginPlay();
    
    // Cache references here, not in Tick
    CachedPC = UGameplayStatics::GetPlayerController(this, 0);

    if (bIsActive)
    {
        UE_LOG(LogExampleActor, Log, TEXT("ExampleActor %s started!"), *GetName());
    }
}

void AExampleActor::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    // Clean up any strict delegates or handles here
    Super::EndPlay(EndPlayReason);
}

void AExampleActor::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    // Ticking is disabled by default in constructor, so this won't run unless enabled explicitly.
}
