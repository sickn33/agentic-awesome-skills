"""Local example boundaries, not a process sandbox. AAS adaptation, Apache-2.0."""
from pathlib import Path
import itertools
import json
import math
import os
import random
import re
import tempfile


def revision(repo):
    mapping = json.loads(os.environ.get('ST_REVISIONS_JSON', '{}'))
    value = mapping.get(repo)
    if not isinstance(value, str) or not re.fullmatch(r'[0-9a-f]{40}', value):
        raise ValueError('Provide an audited full revision for every model/dataset in ST_REVISIONS_JSON')
    return value


def prepare_run():
    if os.environ.get('ST_ALLOW_LOCAL_TRAINING') != '1':
        raise SystemExit('Adapt the example, audit dependencies/assets, then explicitly enable local training.')
    steps = int(os.environ.get('ST_MAX_STEPS', '0'))
    if not 1 <= steps <= 1000:
        raise ValueError('ST_MAX_STEPS must be 1..1000')
    parent = Path(os.environ['ST_RUN_PARENT']).expanduser().absolute()
    if not parent.is_dir() or any(p.is_symlink() for p in (parent, *parent.parents)):
        raise ValueError('ST_RUN_PARENT must be an existing directory without symlinks')
    if os.environ.get('WORLD_SIZE', '1') != '1':
        raise ValueError('These examples support one process; adapt rank-safe persistence before distributed runs')
    # SDK offline flags are set before imports in each entry point as well.
    os.chdir(tempfile.mkdtemp(prefix='st-training-', dir=parent))
    os.umask(0o077)


def safe_model(factory, name=None, tokenizer=False, **kwargs):
    if name is None:
        return factory(**kwargs)  # a reviewed local modules=[...] pipeline
    if Path(name).exists():
        raise ValueError('Local model paths need a separately audited loader; use an immutable cached Hub revision')
    if tokenizer:
        from huggingface_hub import hf_hub_download
        from tokenizers import Tokenizer
        path = hf_hub_download(name, 'tokenizer.json', revision=revision(name), local_files_only=True)
        return Tokenizer.from_file(path)
    kwargs.update(revision=revision(name), local_files_only=True)
    if not tokenizer:
        kwargs['trust_remote_code'] = False
        model_kwargs = dict(kwargs.get('model_kwargs', {}))
        model_kwargs['use_safetensors'] = True
        kwargs['model_kwargs'] = model_kwargs
    return factory(name, **kwargs)


def load_dataset(name, *args, **kwargs):
    from datasets import Dataset, load_dataset as sdk_load_dataset
    cap = int(os.environ.get('ST_MAX_ROWS', '200'))
    if not 2 <= cap <= 20000:
        raise ValueError('ST_MAX_ROWS must be 2..20000 per dataset load')
    if kwargs.get('split') is None or 'revision' in kwargs or 'streaming' in kwargs:
        raise ValueError('Use an explicit split; revision and streaming are controlled by this loader')
    stream = sdk_load_dataset(name, *args, revision=revision(name), streaming=True, **kwargs)
    rows = list(itertools.islice(stream, cap))
    if len(rows) < 2:
        raise ValueError('Dataset needs at least two rows')
    # Row count is bounded, not row byte size, SDK cache usage, evaluator cost or memory.
    return Dataset.from_list(rows, features=stream.features)


def group_split(dataset, test_rows, seed=12):
    keys = [name for name in ("query", "anchor", "question") if name in dataset.column_names]
    if len(keys) != 1:
        raise ValueError("Select exactly one explicit query/anchor/question column before splitting")
    key = keys[0]
    groups = list(dict.fromkeys(dataset[key]))
    if len(groups) < 2:
        raise ValueError('At least two distinct queries required')
    random.Random(seed).shuffle(groups)
    fraction = min(.5, max(1 / len(dataset), test_rows / len(dataset)))
    count = max(1, min(len(groups)-1, math.ceil(len(groups)*fraction)))
    held = set(groups[:count])
    return {'train': dataset.select([i for i, q in enumerate(dataset[key]) if q not in held]),
            'test': dataset.select([i for i, q in enumerate(dataset[key]) if q in held])}
