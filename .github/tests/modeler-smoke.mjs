import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});

async function openPage(viewport){
 const page=await browser.newPage({viewport});
 const errors=[];
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/favicon/i.test(m.text()))errors.push('console: '+m.text())});
 await page.goto('http://127.0.0.1:4173/modeler.html',{waitUntil:'networkidle',timeout:90000});
 await page.waitForFunction(()=>window.__modeler?.version==='0.2.0',{timeout:30000});
 return {page,errors};
}

{
 const {page,errors}=await openPage({width:1440,height:900});
 assert.equal(await page.evaluate(()=>window.__modeler.objectCount()),0,'cena deve iniciar vazia');
 await page.click('[data-primitive="cube"]');
 assert.equal(await page.evaluate(()=>window.__modeler.objectCount()),1,'cubo deve ser criado');
 assert.equal(await page.evaluate(()=>window.__modeler.selectedName()),'Cube');
 await page.click('#duplicateBtn');
 assert.equal(await page.evaluate(()=>window.__modeler.objectCount()),2,'duplicação deve criar cópia');
 await page.click('#deleteBtn');
 assert.equal(await page.evaluate(()=>window.__modeler.objectCount()),1,'exclusão deve remover selecionado');
 await page.click('#undoBtn');
 assert.equal(await page.evaluate(()=>window.__modeler.objectCount()),2,'undo deve restaurar objeto');

 await page.evaluate(()=>window.__modeler.newProject());
 await page.click('[data-primitive="cube"]');
 await page.check('#mirrorX');
 assert.deepEqual(await page.evaluate(()=>window.__modeler.mirrorAxes()),['x'],'mirror X deve ativar');
 await page.uncheck('#mirrorX');
 assert.deepEqual(await page.evaluate(()=>window.__modeler.mirrorAxes()),[],'desligar mirror deve aplicar e liberar modo assimétrico');
 assert.equal(await page.evaluate(()=>window.__modeler.objectCount()),1,'mirror mesclado deve continuar como um objeto');

 await page.click('#vertexModeBtn');
 assert.equal(await page.evaluate(()=>window.__modeler.meshMode()),true,'modo vértice deve abrir');
 await page.click('#subdivideBtn');
 assert.equal(await page.evaluate(()=>window.__modeler.meshMode()),true,'subdivide deve manter edição ativa');

 await page.evaluate(()=>window.__modeler.newProject());
 await page.selectOption('#templateSelect','car');
 await page.click('#createTemplateBtn');
 assert.deepEqual(await page.evaluate(()=>window.__modeler.mounts()),{total:4,used:0},'carro deve ter quatro mounts livres');
 await page.click('#addWheelBtn');
 assert.deepEqual(await page.evaluate(()=>window.__modeler.mounts()),{total:4,used:1},'primeira roda deve ocupar um mount');
 await page.click('#undoBtn');
 assert.deepEqual(await page.evaluate(()=>window.__modeler.mounts()),{total:4,used:0},'undo da roda deve liberar mount');
 await page.click('#addWheelBtn');
 assert.deepEqual(await page.evaluate(()=>window.__modeler.mounts()),{total:4,used:1},'mount deve poder ser reutilizado após undo');

 assert.deepEqual(errors,[],errors.join('\n'));
 await page.close();
}

{
 const {page,errors}=await openPage({width:390,height:844});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert.ok(overflow<=2,`layout mobile não deve vazar horizontalmente: ${overflow}px`);
 assert.equal(await page.locator('.mobile-transform-toolbar').isVisible(),true,'toolbar mobile deve aparecer');
 await page.click('[data-primitive="sphere"]');
 assert.equal(await page.evaluate(()=>window.__modeler.objectCount()),1,'criação deve funcionar no viewport mobile');
 assert.deepEqual(errors,[],errors.join('\n'));
 await page.close();
}

await browser.close();
console.log('Modeler smoke test OK');
