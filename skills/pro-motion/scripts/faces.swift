import Foundation
import Vision
import CoreImage
// usage: swift faces.swift img... → prints JSON {file: [x,y,w,h] normalized, top-left origin}
var out: [String: [Double]] = [:]
for p in CommandLine.arguments.dropFirst() {
  guard let ci = CIImage(contentsOf: URL(fileURLWithPath: p)) else { continue }
  let h = VNImageRequestHandler(ciImage: ci); let r = VNDetectFaceRectanglesRequest()
  try? h.perform([r])
  if let f = r.results?.max(by: { $0.boundingBox.width < $1.boundingBox.width }) {
    let b = f.boundingBox; out[(p as NSString).lastPathComponent] = [b.minX, 1 - b.maxY, b.width, b.height]
  }
}
let d = try! JSONSerialization.data(withJSONObject: out, options: [.sortedKeys]); print(String(data: d, encoding: .utf8)!)
