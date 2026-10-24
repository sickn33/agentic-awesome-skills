import Foundation
import Vision
import CoreImage
import AppKit
// usage: swift cut.swift in.png out_rgba.png [erodePx=2]
// Apple Vision foreground mask (macOS 14+) -> transparent PNG. Erodes the mask a few px to kill the coloured fringe
// (halo of the old background) that otherwise shows up as a blue/white edge after vectorising.
let a = CommandLine.arguments
guard a.count >= 3, let ci = CIImage(contentsOf: URL(fileURLWithPath: a[1])) else { print("usage: cut.swift in out [erodePx]"); exit(1) }
let erode = a.count > 3 ? Double(a[3]) ?? 2 : 2
let h = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
try h.perform([req])
guard let obs = req.results?.first else { print("no subject found"); exit(2) }
let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: h)
var mask = CIImage(cvPixelBuffer: buf)
if erode > 0 { mask = mask.applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: erode]) }
let clear = CIImage(color: .clear).cropped(to: ci.extent)
let out = ci.applyingFilter("CIBlendWithMask", parameters: [kCIInputBackgroundImageKey: clear, kCIInputMaskImageKey: mask])
let ctx = CIContext()
try ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: a[2]), format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("ok", a[2])
