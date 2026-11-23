#!/bin/bash
# Publica uma versão nova: carimba a versão (o app mostra o botão «Atualizar»), renova o cache e envia.
set -e; cd "$(dirname "$0")"
V=$(TZ=America/Sao_Paulo date +"%d/%m %H:%M")
python3 - "$V" <<'PY'
import re,sys
v=sys.argv[1]; s=open('index.html').read()
s,n=re.subn(r'"version": "[^"]*"','"version": "%s"'%v,s,count=1); assert n==1
open('index.html','w').write(s); open('version.json','w').write('{"v": "%s"}'%v)
w=open('sw.js').read(); w=re.sub(r'enem-v(\d+)',lambda m:'enem-v%d'%(int(m.group(1))+1),w,count=1); open('sw.js','w').write(w)
PY
git add -A; git commit -q -F "${1:?mensagem do commit (arquivo)}"; git push -q origin HEAD:main
echo "publicado: $V"
