#!/usr/bin/env python3
"""Atualiza URLs absolutas nas tags canonical, Open Graph, JSON-LD, sitemap e robots.
Exemplos:
  python configurar-seo.py https://dellsoares.github.io/ws-tools/
  python configurar-seo.py https://wstools.com.br/
"""
from pathlib import Path
from urllib.parse import urlsplit
import sys

root=Path(__file__).resolve().parent
old=(root/'site-url.txt').read_text(encoding='utf-8').strip()
if len(sys.argv)!=2:sys.exit('Uso: python configurar-seo.py https://SEU-DOMINIO-OU-PAGES/CAMINHO/')
new=sys.argv[1].strip().rstrip('/')+'/'
p=urlsplit(new)
if p.scheme!='https' or not p.netloc or p.username or p.password or p.fragment or p.query:sys.exit('Informe URL HTTPS absoluta válida, sem parâmetros ou fragmentos.')
for file in [*root.rglob('index.html'),root/'robots.txt',root/'sitemap.xml',root/'llms.txt']:
 txt=file.read_text(encoding='utf-8')
 txt=txt.replace(old,new)
 file.write_text(txt,encoding='utf-8')
(root/'site-url.txt').write_text(new+'\n',encoding='utf-8')
print('SEO atualizado:',old,'->',new)
