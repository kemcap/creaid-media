#!/usr/bin/env python3
"""Isolated HTTP + TLS Apache fixture using the actual generated IONOS rules."""
from pathlib import Path
import http.client, ssl, socket, subprocess, tempfile, time, shutil

HOST='creaid-media.de'
MODULES=Path('/usr/lib/apache2/modules')
def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1',0))
        return s.getsockname()[1]
def request(p,secure,host,path):
    conn=(http.client.HTTPSConnection('127.0.0.1',p,timeout=5,context=ssl._create_unverified_context()) if secure
          else http.client.HTTPConnection('127.0.0.1',p,timeout=5))
    try:
        conn.request('GET',path,headers={'Host':host})
        response=conn.getresponse();response.read()
        return response.status, response.getheader('Location'),response.getheader('X-Robots-Tag','')
    finally:conn.close()
def check(source):
    with tempfile.TemporaryDirectory(prefix='creaid-host-test-') as directory:
        root=Path(directory);root.chmod(0o755)
        site=root/'site';site.mkdir(mode=0o755)
        shutil.copyfile(source/'.htaccess',site/'.htaccess')
        for f in ('index.html','webdesign.html'):
            (site/f).write_text('<html><body>Fixture</body></html>')
        subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=localhost','-keyout',str(root/'key.pem'),'-out',str(root/'cert.pem')],check=True,capture_output=True)
        http,https=port(),port()
        while https==http:https=port()
        lines=[f'ServerRoot "{root}"',f'Listen 127.0.0.1:{http}',f'Listen 127.0.0.1:{https}', 'ServerName localhost',f'PidFile "{root}/httpd.pid"',f'ErrorLog "{root}/error.log"']
        for module in ('mpm_event','authz_core','headers','mime','dir','rewrite','ssl','socache_shmcb'):
            file=MODULES/f'mod_{module}.so'
            assert file.exists(),file
            lines.append(f'LoadModule {module}_module "{file}"')
        lines += ['User www-data','Group www-data','TypesConfig /etc/mime.types',f'DocumentRoot "{site}"',f'<Directory "{site}">','AllowOverride All','Require all granted','DirectoryIndex index.html','</Directory>',
                  f'<VirtualHost 127.0.0.1:{http}>','ServerName localhost','</VirtualHost>',
                  f'<VirtualHost 127.0.0.1:{https}>','ServerName localhost','SSLEngine on',f'SSLCertificateFile "{root}/cert.pem"',f'SSLCertificateKeyFile "{root}/key.pem"','</VirtualHost>']
        conf=root/'httpd.conf';conf.write_text('\n'.join(lines)+'\n')
        proc=subprocess.Popen(['/usr/sbin/apache2','-f',str(conf),'-DFOREGROUND'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for _ in range(50):
                if proc.poll() is not None: raise RuntimeError('Apache exited')
                try:request(http,False,'localhost','/');break
                except OSError:time.sleep(.1)
            else:raise RuntimeError('Apache startup failed')
            for p,secure,host in ((http,False,HOST),(http,False,'www.'+HOST),(https,True,'www.'+HOST)):
                for path in ('/','/webdesign?qa=1&service=test%20value'):
                    code,loc,_=request(p,secure,host,path)
                    assert (code,loc)==(301,'https://'+HOST+path),(host,path,code,loc)
            code,loc,_=request(https,True,HOST,'/webdesign?qa=1')
            assert (code,loc)==(200,None),(code,loc)
            code,_,robots=request(https,True,'vorschau.'+HOST,'/')
            assert code==200 and 'noindex' in robots.lower(),(code,robots)
            code,_,_=request(http,False,'unrelated.example','/')
            assert code==200,code
            print('PASS: '+str(source)+' — three canonical host redirects, preserved query, canonical TLS, protected preview, unrelated host unaffected.')
        except Exception:
            if (root/'error.log').exists(): print((root/'error.log').read_text())
            raise
        finally:
            proc.terminate()
            try:proc.wait(timeout=5)
            except subprocess.TimeoutExpired:proc.kill();proc.wait()
for source in (Path('dist'),Path('preview-cache-package/site')):check(source)
