# Supported Model Architectures

This document lists the model architectures currently supported by Transformers.js.

## Natural Language Processing

### Text Models
- **ALBERT** - A Lite BERT for Self-supervised Learning
- **BERT** - Bidirectional Encoder Representations from Transformers
- **CamemBERT** - French language model based on RoBERTa
- **CodeGen** - Code generation models
- **CodeLlama** - Code-focused Llama models
- **Cohere** - Command-R models for RAG
- **DeBERTa** - Decoding-enhanced BERT with Disentangled Attention
- **DeBERTa-v2** - Improved version of DeBERTa
- **DistilBERT** - Distilled version of BERT (smaller, faster)
- **GPT-2** - Generative Pre-trained Transformer 2
- **GPT-Neo** - Open source GPT-3 alternative
- **GPT-NeoX** - Larger GPT-Neo models
- **LLaMA** - Large Language Model Meta AI
- **Mistral** - Mistral AI language models
- **MPNet** - Masked and Permuted Pre-training
- **MobileBERT** - Compressed BERT for mobile devices
- **RoBERTa** - Robustly Optimized BERT
- **T5** - Text-to-Text Transfer Transformer
- **XLM-RoBERTa** - Multilingual RoBERTa

### Sequence-to-Sequence
- **BART** - Denoising Sequence-to-Sequence Pre-training
- **Blenderbot** - Open-domain chatbot
- **BlenderbotSmall** - Smaller Blenderbot variant
- **M2M100** - Many-to-Many multilingual translation
- **MarianMT** - Neural machine translation
- **mBART** - Multilingual BART
- **NLLB** - No Language Left Behind (200 languages)
- **Pegasus** - Pre-training with extracted gap-sentences

## Computer Vision

### Image Classification
- **BEiT** - BERT Pre-Training of Image Transformers
- **ConvNeXT** - Modern ConvNet architecture
- **ConvNeXTV2** - Improved ConvNeXT
- **DeiT** - Data-efficient Image Transformers
- **DINOv2** - Self-supervised Vision Transformer
- **DINOv3** - Latest DINO iteration
- **EfficientNet** - Efficient convolutional networks
- **MobileNet** - Lightweight models for mobile
- **MobileViT** - Mobile Vision Transformer
- **ResNet** - Residual Networks
- **SegFormer** - Semantic segmentation transformer
- **Swin** - Shifted Window Transformer
- **ViT** - Vision Transformer

### Object Detection
- **DETR** - Detection Transformer
- **D-FINE** - Fine-grained Distribution Refinement for object detection
- **DINO** - DETR with Improved deNoising anchOr boxes
- **Grounding DINO** - Open-set object detection
- **YOLOS** - You Only Look at One Sequence

### Segmentation
- **CLIPSeg** - Image segmentation with text prompts
- **Mask2Former** - Universal image segmentation
- **SAM** - Segment Anything Model
- **EdgeTAM** - On-Device Track Anything Model

### Depth & Pose
- **DPT** - Dense Prediction Transformer
- **Depth Anything** - Monocular depth estimation
- **Depth Pro** - Sharp monocular metric depth
- **GLPN** - Global-Local Path Networks for depth

## Audio

### Speech Recognition
- **Wav2Vec2** - Self-supervised speech representations
- **Whisper** - Robust speech recognition (multilingual)
- **HuBERT** - Self-supervised speech representation learning

### Audio Processing
- **Audio Spectrogram Transformer** - Audio classification
- **DAC** - Descript Audio Codec

### Text-to-Speech
- **SpeechT5** - Unified speech and text pre-training
- **VITS** - Conditional Variational Autoencoder with adversarial learning

## Multimodal

### Vision-Language
- **CLIP** - Contrastive Language-Image Pre-training
- **Chinese-CLIP** - Chinese version of CLIP
- **ALIGN** - Large-scale noisy image-text pairs
- **BLIP** - Bootstrapping Language-Image Pre-training
- **Florence-2** - Unified vision foundation model
- **LLaVA** - Large Language and Vision Assistant
- **Moondream** - Tiny vision-language model

### Document Understanding
- **DiT** - Document Image Transformer
- **Donut** - OCR-free Document Understanding
- **LayoutLM** - Pre-training for document understanding
- **TrOCR** - Transformer-based OCR

### Audio-Language
- **CLAP** - Contrastive Language-Audio Pre-training

## Embeddings & Similarity

- **Sentence Transformers** - Sentence embeddings
- **all-MiniLM** - Efficient sentence embeddings
- **all-mpnet-base** - High-quality sentence embeddings
- **E5** - Text embeddings by Microsoft
- **BGE** - General embedding models
- **nomic-embed** - Long context embeddings

## Specialized Models

### Code
- **CodeBERT** - Pre-trained model for code
- **GraphCodeBERT** - Code structure understanding
- **StarCoder** - Code generation

### Scientific
- **SciBERT** - Scientific text
- **BioBERT** - Biomedical text

### Retrieval
- **ColBERT** - Contextualized late interaction over BERT
- **DPR** - Dense Passage Retrieval

## Model Selection Tips

### For Text Tasks
- **Small & Fast**: DistilBERT, MobileBERT
- **Balanced**: BERT-base, RoBERTa-base
- **High Accuracy**: RoBERTa-large, DeBERTa-v3-large
- **Multilingual**: XLM-RoBERTa, mBERT

### For Vision Tasks
- **Mobile/Browser**: MobileNet, EfficientNet-B0
- **Balanced**: DeiT-base, ConvNeXT-tiny
- **High Accuracy**: Swin-large, DINOv2-large

### For Audio Tasks
- **Speech Recognition**: Whisper-tiny (fast), Whisper-large (accurate)
- **Audio Classification**: Audio Spectrogram Transformer

### For Multimodal
- **Vision-Language**: CLIP (general), Florence-2 (comprehensive)
- **Document AI**: Donut, LayoutLM
- **OCR**: TrOCR

## Finding Models on Hugging Face Hub

Search for compatible models:
```
https://huggingface.co/models?library=transformers.js
```

Filter by task:
```
https://huggingface.co/models?pipeline_tag=text-classification&library=transformers.js
```

Check for ONNX support by looking for `onnx/` folder in model repository.
