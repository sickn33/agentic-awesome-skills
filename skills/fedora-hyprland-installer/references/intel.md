# Intel Graphics Support

## Driver Architecture
Intel Integrated & Arc graphics utilize kernel drivers (`i915` or `xe`) and the Mesa Intel driver (`iris` / `ANV`).

## Verification
- Verify hardware acceleration: `vainfo`
- Check active driver: `lspci -nnk | grep -A 2 VGA`
