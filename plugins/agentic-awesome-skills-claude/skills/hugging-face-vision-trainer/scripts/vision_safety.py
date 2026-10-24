"""Bounded local-only training guards; no third-party imports or network at import."""
import argparse
import itertools
import math
import os
from pathlib import Path
import re
import sys


def execution_guard(argv=None):
    values=list(sys.argv[1:] if argv is None else argv)
    p=argparse.ArgumentParser(description="Local-only vision pilot. Review dependencies first; no publishing or telemetry.")
    p.add_argument("--allow-training",action="store_true")
    p.add_argument("--model_name_or_path",required=True)
    p.add_argument("--model_revision",required=True)
    p.add_argument("--dataset_name",required=True)
    p.add_argument("--dataset_revision",required=True)
    p.add_argument("--output_dir",required=True)
    p.add_argument("--max_steps",type=int,required=True)
    p.add_argument("--max_train_samples",type=int,required=True)
    p.add_argument("--max_eval_samples",type=int,required=True)
    a,unknown=p.parse_known_args(values)
    if not a.allow_training:p.error("--allow-training is required before loading training dependencies")
    if not all(re.fullmatch(r"[0-9a-fA-F]{40}",rev) for rev in (a.model_revision,a.dataset_revision)):
        p.error("Model and dataset revisions must be full 40-character commit IDs")
    if not 1<=a.max_steps<=1000 or not all(2<=n<=10000 for n in (a.max_train_samples,a.max_eval_samples)):
        p.error("Use max_steps 1..1000 and sample caps 2..10000")
    if any(x.split("=")[0] in {"--push_to_hub","--hub_token","--token","--trust_remote_code","--resume_from_checkpoint","--overwrite_output_dir"} for x in unknown):
        p.error("Publishing, inline credentials, remote code, resume and overwrite are disabled in this pilot")
    out=Path(a.output_dir).expanduser().absolute()
    if out.exists() or out.is_symlink() or not out.parent.is_dir():p.error("Choose a new output directory under an existing approved parent")
    if any(parent.is_symlink() for parent in [out.parent,*out.parent.parents]):p.error("Output parents must not be symlinks")
    # Directory creation happens after all semantic arguments are validated in main().
    os.environ["HF_HUB_DISABLE_TELEMETRY"]="1"
    os.environ["WANDB_DISABLED"]="true"
    if argv is None:sys.argv=[sys.argv[0],*[x for x in values if x!="--allow-training"]]
    return a


def configure_local_run(model_args,data_args,training_args):
    if model_args.trust_remote_code or training_args.push_to_hub or model_args.token or training_args.hub_token:
        raise ValueError("Remote code, publication and inline token arguments are disabled")
    for rev in (model_args.model_revision,data_args.dataset_revision):
        if not re.fullmatch(r"[0-9a-fA-F]{40}",rev):raise ValueError("Pin full model/dataset revisions")
    if not 1<=training_args.max_steps<=1000:raise ValueError("Bound training max_steps")
    if not all(n is not None and 2<=n<=10000 for n in (data_args.max_train_samples,data_args.max_eval_samples)):
        raise ValueError("Bound training/evaluation samples")
    if data_args.train_val_split is not None and not 0<float(data_args.train_val_split)<1:
        raise ValueError("train_val_split must be strictly between zero and one")
    if not math.isfinite(training_args.learning_rate) or training_args.learning_rate<=0:
        raise ValueError("Use a finite positive learning rate")
    if not 1<=training_args.per_device_train_batch_size<=32 or not 1<=training_args.per_device_eval_batch_size<=32:
        raise ValueError("Pilot batch sizes must be 1..32")
    for name in ("config_name","image_processor_name"):
        if getattr(model_args,name,None) not in (None,model_args.model_name_or_path):
            raise ValueError("Use the same pinned repository for model/config/processor")
    out=Path(training_args.output_dir).expanduser().absolute()
    if out.exists() or out.is_symlink() or not out.parent.is_dir():raise ValueError("Output must be new")
    out.mkdir(mode=0o700,exist_ok=False)
    training_args.report_to=[]
    training_args.push_to_hub=False
    training_args.save_safetensors=True
    training_args.dataloader_num_workers=0
    training_args.remove_unused_columns=False


def load_bounded_dataset(name,config=None,*,revision,train_limit,eval_limit,cache_dir=None,**unused):
    from datasets import load_dataset,get_dataset_split_names,Dataset
    splits=get_dataset_split_names(name,config,revision=revision)
    if "train" not in splits:raise ValueError("An explicit train split is required; do not relabel held-out test data")
    result={}
    for split in [x for x in ("train","validation","test") if x in splits]:
        stream=load_dataset(name,config,split=split,revision=revision,streaming=True,cache_dir=cache_dir)
        rows=list(itertools.islice(stream,train_limit if split=="train" else eval_limit))
        if not rows:raise ValueError("Empty dataset split")
        result[split]=Dataset.from_list(rows,features=stream.features)
    return result


def validated_xywh(box,width,height,fmt):
    if fmt not in {"xywh","xyxy"}:raise ValueError("Specify xywh or xyxy explicitly")
    if not isinstance(box,(list,tuple)) or len(box)!=4:raise ValueError("Expected four coordinates")
    if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) for v in box):raise ValueError("Coordinates must be finite numbers")
    x,y,c,d=map(float,box)
    right,bottom=(x+c,y+d) if fmt=="xywh" else (c,d)
    if not (0<=x<right<=width and 0<=y<bottom<=height):raise ValueError("Box outside image or degenerate; correct annotations explicitly")
    return [x,y,right-x,bottom-y]
