/* Gerador PDF mínimo baseado em imagens JPEG. Sem dependências externas. */
(()=>{'use strict';
const te=new TextEncoder();
const ascii=s=>te.encode(s);
async function assemble(pages){
 if(!pages.length)throw Error('Nenhuma página para gerar PDF.');
 if(pages.length>40)throw Error('O limite é de 40 páginas por arquivo.');
 const parts=[],positions=[0],lengthRef={value:0};
 function write(x){const part=typeof x==='string'?ascii(x):x;parts.push(part);lengthRef.value+=part.byteLength;}
 const total=2+pages.length*3;
 function object(id,body){positions[id]=lengthRef.value;write(id+' 0 obj\n');write(body);write('\nendobj\n');}
 write('%PDF-1.4\n%WS-PDF\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] /Count '+pages.length+' >>');
 for(let i=0;i<pages.length;i++){
   const p=pages[i],id=3+3*i;const [W,H,ix,iy,iw,ih]=[p.pageWidth,p.pageHeight,p.x,p.y,p.width,p.height].map(Number);
   if(![W,H,ix,iy,iw,ih,p.imageWidth,p.imageHeight].every(Number.isFinite))throw Error('Dimensões inválidas no PDF.');
   object(id,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(3)} ${H.toFixed(3)}] /Resources << /XObject << /Im${i} ${id+1} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${id+2} 0 R >>`);
   const bytes=new Uint8Array(await p.blob.arrayBuffer());
   positions[id+1]=lengthRef.value;
   write(`${id+1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.imageWidth} /Height ${p.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
   write(bytes);write('\nendstream\nendobj\n');
   const transform=`q\n${iw.toFixed(3)} 0 0 ${ih.toFixed(3)} ${ix.toFixed(3)} ${iy.toFixed(3)} cm\n/Im${i} Do\nQ\n`;
   object(id+2,`<< /Length ${ascii(transform).length} >>\nstream\n${transform}endstream`);
 }
 const xrefStart=lengthRef.value;
 write(`xref\n0 ${total+1}\n0000000000 65535 f \n`);
 for(let i=1;i<=total;i++)write(String(positions[i]).padStart(10,'0')+' 00000 n \n');
 write(`trailer\n<< /Size ${total+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);
 return new Blob(parts,{type:'application/pdf'});
}
window.WSPDF={assemble};
})();
