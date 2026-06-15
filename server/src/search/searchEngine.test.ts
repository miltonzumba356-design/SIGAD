import assert from 'node:assert/strict';
import test from 'node:test';
import { searchDocuments } from './searchEngine';
import { IndexedDocument } from './searchTypes';

const documents: IndexedDocument[] = [
  {
    id: '1',
    name: 'contrato digital.docx',
    type: 'digital',
    text: 'contrato publico de prestacao de servicos com assinatura validada',
    paragraphs: ['contrato publico de prestacao de servicos com assinatura validada'],
    wordMap: { contrato: 1, publico: 1, prestacao: 1, servicos: 1, assinatura: 1, validada: 1 },
    wordCount: 7,
    pages: 1,
    indexedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'processo escaneado.pdf',
    type: 'ocr',
    text: 'imagem processada por ocr contendo despacho ministerial urgente',
    paragraphs: ['imagem processada por ocr contendo despacho ministerial urgente'],
    wordMap: { imagem: 1, processada: 1, ocr: 1, contendo: 1, despacho: 1, ministerial: 1, urgente: 1 },
    wordCount: 7,
    pages: 2,
    indexedAt: new Date().toISOString()
  }
];

test('query simples retorna documento relevante', () => {
  const results = searchDocuments(documents, 'contrato');
  assert.equal(results.length, 1);
  assert.equal(results[0].docId, '1');
  assert.equal(results[0].score, 100);
});

test('query com frase recebe bonus e snippet marcado', () => {
  const results = searchDocuments(documents, 'despacho ministerial');
  assert.equal(results[0].docId, '2');
  assert.equal(results[0].score, 100);
  assert.match(results[0].snippet, /\[\[MATCH\]\]despacho\[\[\/MATCH\]\]/);
});

test('query sem resultados retorna lista vazia', () => {
  const results = searchDocuments(documents, 'inexistente');
  assert.deepEqual(results, []);
});

test('filtro por tipo restringe resultados', () => {
  const results = searchDocuments(documents, 'despacho', { filter: 'digital' });
  assert.deepEqual(results, []);
});
