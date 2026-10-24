#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""AAS adaptation: bounded public dataset metadata preview, never a training certificate."""
import argparse
import json
import math
import urllib.parse
import urllib.request

class NoRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        raise ValueError('Dataset preview redirects are not accepted')

def api_request(url):
    parsed=urllib.parse.urlsplit(url)
    if parsed.scheme!='https' or parsed.hostname!='datasets-server.huggingface.co' or parsed.username or parsed.password or parsed.port not in (None,443):
        raise ValueError('Only the approved public Datasets Server host is supported')
    with urllib.request.build_opener(NoRedirects()).open(url,timeout=15) as response:
        raw=response.read(2*1024*1024+1)
    if len(raw)>2*1024*1024:raise ValueError('Preview exceeds 2MiB')
    result=json.loads(raw)
    if not isinstance(result,dict):raise ValueError('Expected a JSON object')
    return result

def endpoint(path,**values):
    return 'https://datasets-server.huggingface.co/'+path+'?'+urllib.parse.urlencode(values)

def detect_bbox_format(bbox,image_size=None):
    if not isinstance(bbox,(list,tuple)) or len(bbox)!=4:return 'invalid'
    if any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) for v in bbox):return 'invalid'
    return 'ambiguous: require declared xywh/xyxy and pixel/normalized convention'

def inspect(dataset,config,split,samples=0):
    if not 0<=samples<=20:raise ValueError('samples must be 0..20')
    data=api_request(endpoint('splits',dataset=dataset))
    available=data.get('splits',[])
    matching=[x for x in available if x.get('config')==config and x.get('split')==split]
    if len(matching)!=1:raise ValueError('Choose an explicit config/split present in the dataset metadata')
    result={'dataset':dataset,'config':config,'split':split,'validated':False,
            'status':'advisory-preview-only','sampleCount':0,
            'limits':['Public viewer may not reflect a pinned revision.','No image/mask decode or full dataset validation.','Box conventions and class mapping require dataset documentation.']}
    if samples:
        rows=api_request(endpoint('rows',dataset=dataset,config=config,split=split,offset=0,length=samples))
        examples=rows.get('rows',[])
        if not isinstance(examples,list) or len(examples)>samples:raise ValueError('Unexpected preview rows')
        result['sampleCount']=len(examples)
        result['columns']=sorted({k for item in examples for k in item.get('row',{})})
        # Do not print personal row contents, image URLs, prompts or generated executable code.
        result['featureNames']=[x.get('name') for x in rows.get('features',[]) if isinstance(x,dict)]
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--dataset',required=True);p.add_argument('--config',required=True);p.add_argument('--split',required=True)
    p.add_argument('--samples',type=int,default=0);p.add_argument('--json-output',action='store_true')
    a=p.parse_args()
    try:result=inspect(a.dataset,a.config,a.split,a.samples)
    except (ValueError,OSError,KeyError,TypeError):
        print(json.dumps({'status':'failed','validated':False,'error':'Metadata preview failed; verify dataset/config/split and approved network access'}));return 1
    print(json.dumps(result,ensure_ascii=True));return 0
if __name__=='__main__':raise SystemExit(main())
