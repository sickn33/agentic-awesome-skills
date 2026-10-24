import Foundation
import Vision
import CoreImage
import AppKit
// usage: swift cutout.swift in.jpg out_mask.png
let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
guard let ci = CIImage(contentsOf: url) else { print("load fail"); exit(1) }
let handler = VNImageRequestHandler(ciImage: ci)
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let obs = req.results?.first else { print("no subject"); exit(2) }
let buf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: buf)
let ctx = CIContext()
let cs = CGColorSpace(name: CGColorSpace.linearGray)!
try ctx.writePNGRepresentation(of: mask, to: URL(fileURLWithPath: args[2]), format: .L8, colorSpace: cs)
print("ok", args[2])
