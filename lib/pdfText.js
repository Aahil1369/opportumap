// A PDF's text, read with pdf-parse (server only). The resume routes hand this to their handlers
// (lib/resumeGrade.js, lib/coverLetterApi.js); the tests hand them a stand-in instead. It throws
// for a file it cannot open.
export async function pdfText(buffer) {
  const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  return (await pdfParse(buffer)).text;
}
