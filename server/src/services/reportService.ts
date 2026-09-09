import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDatabase } from '../config/database';
import { DocumentoModel } from '../models/DocumentoModel';
import { EmprestimoModel } from '../models/EmprestimoModel';
import { FilaDigitalizacaoModel } from '../models/FilaDigitalizacaoModel';

function getReportsDir(): string {
  const dir = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads', 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

type ReportLine = { label: string; value: string };

function buildLinhasResumoDocumentos(instituicaoId: number): ReportLine[] {
  const stats = DocumentoModel.getStats(instituicaoId);
  const linhas: ReportLine[] = [
    { label: 'Total de documentos', value: String(stats.total) },
    { label: 'Documentos digitais', value: String(stats.digitalizados) },
    { label: 'Documentos físicos', value: String(stats.fisicos) },
    { label: 'Empréstimos ativos', value: String(stats.emprestimos_ativos) },
    { label: 'Empréstimos em atraso', value: String(stats.atrasados) },
    { label: 'Pendentes de digitalização', value: String(stats.pendentes_dig) }
  ];
  for (const item of stats.porTipo || []) {
    linhas.push({ label: `  • ${item.tipo || 'Sem tipo'}`, value: String(item.total ?? item.count ?? '') });
  }
  return linhas;
}

function buildLinhasEmprestimos(instituicaoId: number): ReportLine[] {
  const emprestimos = EmprestimoModel.listarPorInstituicao(instituicaoId) as Array<{ estado: string }>;
  const porEstado: Record<string, number> = {};
  for (const e of emprestimos) porEstado[e.estado] = (porEstado[e.estado] || 0) + 1;
  return [
    { label: 'Total de pedidos de empréstimo', value: String(emprestimos.length) },
    { label: 'Pendentes', value: String(porEstado.PENDENTE || 0) },
    { label: 'Aprovados (ativos)', value: String(porEstado.APROVADO || 0) },
    { label: 'Rejeitados', value: String(porEstado.REJEITADO || 0) },
    { label: 'Devolvidos', value: String(porEstado.DEVOLVIDO || 0) }
  ];
}

function buildLinhasDigitalizacao(instituicaoId: number): ReportLine[] {
  const fila = FilaDigitalizacaoModel.listarPorInstituicao(instituicaoId) as Array<{ estado: string; tipo_fila: string }>;
  const porEstado: Record<string, number> = {};
  const porTipo: Record<string, number> = {};
  for (const item of fila) {
    porEstado[item.estado] = (porEstado[item.estado] || 0) + 1;
    porTipo[item.tipo_fila] = (porTipo[item.tipo_fila] || 0) + 1;
  }
  return [
    { label: 'Total na fila de digitalização', value: String(fila.length) },
    { label: 'Pendentes', value: String(porEstado.PENDENTE || 0) },
    { label: 'Em curso', value: String(porEstado.EM_CURSO || 0) },
    { label: 'Concluídos', value: String(porEstado.CONCLUIDO || 0) },
    { label: 'Fila digital', value: String(porTipo.DIGITAL || 0) },
    { label: 'Fila física', value: String(porTipo.FISICA || 0) }
  ];
}

function buildLinhasAuditoria(instituicaoId: number): ReportLine[] {
  const db = getDatabase();
  const total = db.prepare('SELECT COUNT(*) as total FROM auditoria WHERE instituicao_id = ?').get(instituicaoId) as { total: number };
  const porAcao = db.prepare(`
    SELECT acao, COUNT(*) as total FROM auditoria
    WHERE instituicao_id = ?
    GROUP BY acao ORDER BY total DESC LIMIT 15
  `).all(instituicaoId) as Array<{ acao: string; total: number }>;

  const linhas: ReportLine[] = [{ label: 'Total de eventos de auditoria', value: String(total.total) }];
  for (const item of porAcao) {
    linhas.push({ label: `  • ${item.acao}`, value: String(item.total) });
  }
  return linhas;
}

const reportBuilders: Record<string, { titulo: string; build: (instituicaoId: number) => ReportLine[] }> = {
  RESUMO_DOCUMENTOS: { titulo: 'Resumo de Documentos', build: buildLinhasResumoDocumentos },
  EMPRESTIMOS: { titulo: 'Relatório de Empréstimos', build: buildLinhasEmprestimos },
  DIGITALIZACAO: { titulo: 'Relatório de Digitalização', build: buildLinhasDigitalizacao },
  AUDITORIA: { titulo: 'Relatório de Auditoria', build: buildLinhasAuditoria }
};

/**
 * Gera um PDF real com os indicadores do tipo de relatório pedido e devolve o caminho no disco.
 */
export async function generateReportFile(tipo: string, instituicaoId: number, instituicaoNome: string): Promise<string> {
  const config = reportBuilders[tipo] || { titulo: tipo, build: () => [{ label: 'Tipo de relatório desconhecido', value: tipo }] };
  const linhas = config.build(instituicaoId);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let page = pdfDoc.addPage([595, 842]); // A4
  let y = 800;

  const drawText = (text: string, size: number, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    if (y < 60) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, { x: 50, y, size, font: bold ? fontBold : font, color });
    y -= size + 10;
  };

  drawText('SIGAD — Sistema Integrado de Gestão de Arquivos e Documentos', 10, false, rgb(0.4, 0.4, 0.4));
  drawText(config.titulo, 20, true);
  drawText(`Instituição: ${instituicaoNome}`, 11, false, rgb(0.3, 0.3, 0.3));
  drawText(`Gerado em: ${new Date().toLocaleString('pt-PT')}`, 11, false, rgb(0.3, 0.3, 0.3));
  y -= 10;

  for (const linha of linhas) {
    drawText(`${linha.label}: ${linha.value}`, 12);
  }

  const bytes = await pdfDoc.save();
  const filename = `relatorio_${tipo.toLowerCase()}_${Date.now()}.pdf`;
  const filePath = path.join(getReportsDir(), filename);
  await fs.promises.writeFile(filePath, bytes);
  return filePath;
}
