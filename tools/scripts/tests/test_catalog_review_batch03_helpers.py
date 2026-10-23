"""Offline behavior checks for the two fully reviewed helpers, with mocked executables."""
import unittest, pathlib,tempfile,subprocess,os,runpy,contextlib,io,unittest.mock,json,re
R=pathlib.Path(__file__).resolve().parents[3]
class Helpers(unittest.TestCase):
 def test_hunter_uses_current_utc_window_and_reads_only(self):
  calls=[]
  def fake(args,**kw):
   calls.append(args)
   data=json.dumps({'full_name':'owner/repo','stars':1200,'description':'fixture'}) if args[1]=='api' else json.dumps([{'number':1,'title':'fixture','url':'https://example.invalid/1'}])
   return subprocess.CompletedProcess(args,0,data,'')
  with unittest.mock.patch('subprocess.run',side_effect=fake),contextlib.redirect_stdout(io.StringIO()) as out: runpy.run_path(str(R/'skills/oss-hunter/bin/hunter.py'),run_name='__main__')
  self.assertIn('Issue #1: fixture',out.getvalue());self.assertRegex(calls[0][2],r'pushed:>\d{4}-\d{2}-\d{2}T');self.assertTrue(all(x[0]=='gh' and x[1] in ('api','issue') for x in calls));self.assertEqual(calls[1][1:3],['issue','list'])
 def android(self,name='safe',fail=False):
  d=tempfile.TemporaryDirectory();self.addCleanup(d.cleanup);p=pathlib.Path(d.name)
  adb=p/'adb';adb.write_text('''#!/bin/bash
printf '%s\\n' "$*" >> "$ADB_CALLS"
if [[ "$*" == *"uiautomator"* && "${FAIL_DUMP:-}" == 1 ]]; then exit 7; fi
if [[ "$*" == *"logcat"* ]]; then printf 'Unrelated private line\\n'; fi
exit 0
''');adb.chmod(0o700)
  env=os.environ.copy();env.update(PATH=str(p)+os.pathsep+env['PATH'],ANDROID_SERIAL='emulator-fixture',ADB_CALLS=str(p/'calls'),FAIL_DUMP='1' if fail else '0')
  got=subprocess.run(['bash',str(R/'skills/android_ui_verification/scripts/verify_ui.sh'),name],cwd=p,env=env,capture_output=True,text=True)
  return got,p,(p/'calls').read_text() if (p/'calls').exists() else ''
 def test_android_rejects_traversal_before_adb(self):
  got,p,calls=self.android('../escape');self.assertEqual(got.returncode,2);self.assertEqual(calls,'');self.assertFalse((p.parent/'escape.png').exists())
 def test_android_fails_before_capture_when_dump_fails(self):
  got,p,calls=self.android(fail=True);self.assertEqual(got.returncode,7);self.assertNotIn('screencap',calls);self.assertNotIn('Done.',got.stdout)
 def test_android_serial_and_empty_js_logs(self):
  got,p,calls=self.android();self.assertEqual(got.returncode,0);self.assertTrue(all(x.startswith('-s emulator-fixture ') for x in calls.splitlines()));self.assertEqual((p/'artifacts/js_logs.txt').read_text(),'');self.assertFalse((p/'artifacts/logcat.txt').exists())
if __name__ == "__main__":
 unittest.main()
