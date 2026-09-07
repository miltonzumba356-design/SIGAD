from __future__ import annotations

from datetime import date
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from xml.sax.saxutils import escape


OUT = Path("docs/Resumo_Implementacao_SIGAD_2026-05-20.docx")


def p(text: str = "", style: str | None = None) -> str:
    style_xml = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    return f"<w:p>{style_xml}<w:r><w:t>{escape(text)}</w:t></w:r></w:p>"


def bullet(text: str) -> str:
    return (
        '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/>'
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
        f"<w:r><w:t>{escape(text)}</w:t></w:r></w:p>"
    )


def table(rows: list[list[str]], widths: list[int]) -> str:
    grid = "".join(f'<w:gridCol w:w="{width}"/>' for width in widths)
    xml = [
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>'
        '<w:tblW w:w="9360" w:type="dxa"/>'
        '<w:tblInd w:w="120" w:type="dxa"/>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>'
        '<w:left w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>'
        '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>'
        '<w:right w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>'
        '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>'
        '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9E2EC"/>'
        "</w:tblBorders></w:tblPr>"
        f"<w:tblGrid>{grid}</w:tblGrid>"
    ]
    for row_index, row in enumerate(rows):
        xml.append("<w:tr>")
        for idx, cell in enumerate(row):
            fill = '<w:shd w:fill="F2F4F7"/>' if row_index == 0 else ""
            bold_open = "<w:b/>" if row_index == 0 else ""
            xml.append(
                '<w:tc><w:tcPr>'
                f'<w:tcW w:w="{widths[idx]}" w:type="dxa"/>{fill}'
                '<w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/>'
                '<w:start w:w="120" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar>'
                "</w:tcPr>"
                f"<w:p><w:r>{bold_open}<w:t>{escape(cell)}</w:t></w:r></w:p>"
                "</w:tc>"
            )
        xml.append("</w:tr>")
    xml.append("</w:tbl>")
    return "".join(xml)


def document_xml() -> str:
    body: list[str] = []
    body.append(p("Resumo de Implementacao - SIGAD", "Title"))
    body.append(p(f"Data: {date.today().isoformat()} | Projeto: Sistema Integrado de Gestao de Arquivos e Documentos", "Subtitle"))
    body.append(p("Este documento consolida as funcionalidades implementadas hoje no frontend e backend do SIGAD, incluindo pesquisa avancada com OCR, CRUD documental, visualizacao protegida e extensao do fluxo para arquivo fisico.", "Lead"))

    body.append(p("1. Pesquisa avancada com OCR", "Heading1"))
    for item in [
        "Criado modulo independente em server/src/search com deteccao de tipo de ficheiro, extracao de texto, OCR, normalizacao, indexacao e motor de pesquisa.",
        "Adicionadas dependencias obrigatorias: tesseract.js v4, pdf-parse, mammoth e sharp.",
        "Implementado OCR singleton com Tesseract para imagens e fallback OCR para PDFs com pouco texto digital.",
        "Criada tabela SQLite search_index para persistir documentos indexados.",
        "Adicionados endpoints POST /api/search, POST /api/v1/search, POST /api/documents/:id/index e POST /api/v1/documents/:id/index.",
    ]:
        body.append(bullet(item))

    body.append(p("2. CRUD completo de documentos digitais", "Heading1"))
    body.append(table([
        ["Funcionalidade", "Implementacao"],
        ["Criar", "Mantido fluxo existente com upload opcional e indexacao automatica quando ha ficheiro."],
        ["Ler/Abrir", "Criado endpoint de ficheiro inline e modal seguro de visualizacao."],
        ["Editar", "Criado modal de edicao de metadados e suporte a multipart PUT."],
        ["Substituir", "Upload de nova versao digital cria nova entrada em ficheiros e reindexa o documento."],
        ["Apagar", "Soft delete via DELETE /documents/:id, mantendo regras de emprestimos ativos."],
        ["Digitalizar/OCR", "Botao de digitalizacao chama o endpoint de indexacao OCR."],
    ], [2200, 7160]))

    body.append(p("3. Visualizacao segura de documentos", "Heading1"))
    for item in [
        "Criado componente SecureDocumentViewer para abrir PDFs/imagens/texto sem botao de download.",
        "Backend serve ficheiros com Content-Disposition inline, Cache-Control no-store e X-Content-Type-Options nosniff.",
        "Frontend bloqueia clique direito, copiar, Ctrl+P, Ctrl+S e Ctrl+C durante a visualizacao.",
        "Adicionada marca d'agua com email do utilizador e ID do documento.",
        "Adicionado CSS @media print para bloquear impressao da tela.",
        "Observacao tecnica: screenshot feito pelo sistema operativo, camera externa ou ferramenta fora do browser nao pode ser impedido 100% por aplicacoes web.",
    ]:
        body.append(bullet(item))

    body.append(p("4. Arquivo fisico", "Heading1"))
    for item in [
        "Arquivo fisico passou a usar o mesmo visualizador seguro do arquivo digital.",
        "Adicionadas acoes por documento fisico: abrir versao digitalizada, editar/substituir, digitalizar e apagar.",
        "Adicionada edicao do nome da localizacao fisica selecionada.",
        "Backend passou a aceitar atualizacao de localizacao fisica do documento durante edicao.",
        "O botao Digitalizar abre o fluxo de carregamento/substituicao da versao digitalizada, preparando o submenu dedicado.",
    ]:
        body.append(bullet(item))

    body.append(p("5. Segurança e configuracao", "Heading1"))
    body.append(table([
        ["Area", "Medida aplicada"],
        ["Variaveis de ambiente", "Criados .env e .env.example no frontend; backend recebeu .env.example seguro."],
        ["Segredos", "JWT_SECRET local substituido por segredo forte e segredo DATABASE_URL real removido do .env."],
        ["CORS", "Origem restrita por CORS_ALLOWED_ORIGINS."],
        ["Rate limit", "Criado middleware simples para API e autenticacao."],
        ["Uploads", "Validacao por MIME e extensao; suporte ampliado para PDF, DOC/DOCX, TXT e imagens."],
        ["Logs", "Removidos logs DEBUG do frontend; SQL verbose desligado por padrao via LOG_SQL=false."],
    ], [2100, 7260]))

    body.append(p("6. Verificacoes realizadas", "Heading1"))
    for item in [
        "Backend TypeScript: .\\node_modules\\.bin\\tsc.cmd --noEmit passou.",
        "Testes do motor de pesquisa: npm.cmd run test:search passou com 4 testes.",
        "Frontend: npm run build passou apos as alteracoes.",
        "Health check do backend foi validado anteriormente em /api/health com resposta 200.",
    ]:
        body.append(bullet(item))

    body.append(p("7. Proximos passos recomendados", "Heading1"))
    for item in [
        "Finalizar submenu dedicado de Digitalizacao para arquivo fisico, com fila, estado, operador e historico.",
        "Adicionar auditoria explicita para abrir, editar, apagar, substituir e digitalizar documentos.",
        "Adicionar permissao especifica para visualizar documentos sigilosos e para substituir ficheiros.",
        "Melhorar visualizacao de DOCX/TXT com renderer HTML ou texto paginado.",
        "Criar testes de integracao para endpoints de documentos e indexacao.",
    ]:
        body.append(bullet(item))

    body.append(
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" '
        'w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{''.join(body)}</w:body></w:document>"
    )


def styles_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="111827"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="36"/><w:color w:val="0B2545"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:sz w:val="20"/><w:color w:val="6B7280"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Lead"><w:name w:val="Lead"/><w:pPr><w:spacing w:before="80" w:after="180" w:line="280" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="23"/><w:color w:val="1F2937"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="2E74B5"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="100" w:line="280" w:lineRule="auto"/></w:pPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9E2EC"/><w:left w:val="single" w:sz="4" w:color="D9E2EC"/><w:bottom w:val="single" w:sz="4" w:color="D9E2EC"/><w:right w:val="single" w:sz="4" w:color="D9E2EC"/><w:insideH w:val="single" w:sz="4" w:color="D9E2EC"/><w:insideV w:val="single" w:sz="4" w:color="D9E2EC"/></w:tblBorders></w:tblPr></w:style>
</w:styles>'''


def numbering_xml() -> str:
    return '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="720"/></w:tabs><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>'''


def write_docx() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>''')
        z.writestr("_rels/.rels", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>''')
        z.writestr("word/_rels/document.xml.rels", '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>''')
        z.writestr("word/document.xml", document_xml())
        z.writestr("word/styles.xml", styles_xml())
        z.writestr("word/numbering.xml", numbering_xml())


if __name__ == "__main__":
    write_docx()
    print(OUT)
