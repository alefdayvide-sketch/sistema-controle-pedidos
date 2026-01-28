
/** 
 * CÓDIGO PARA O GOOGLE APPS SCRIPT (VERSÃO CORRIGIDA)
 * Esta versão é resiliente a diferenças de maiúsculas/minúsculas nos nomes das colunas.
 */

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  const json = rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      // Retorna as chaves exatamente como estão na planilha para o frontend
      obj[header] = row[i];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(json))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const payload = JSON.parse(e.postData.contents);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Função auxiliar para encontrar o índice da coluna ignorando Case (Maiúsculas/Minúsculas)
  const findColumnIndex = (name) => {
    const searchName = name.toString().toLowerCase().trim();
    return headers.findIndex(h => h.toString().toLowerCase().trim() === searchName);
  };

  if (payload.action === "create") {
    // Mapeia o payload para a ordem correta das colunas da planilha
    const newRow = headers.map(header => {
      // Tenta encontrar o valor no payload usando o nome exato da coluna
      return payload[header] !== undefined ? payload[header] : "";
    });
    
    sheet.appendRow(newRow);
    return ContentService.createTextOutput("Created").setMimeType(ContentService.MimeType.TEXT);
  } 
  
  if (payload.action === "update") {
    const idValue = String(payload.id).trim().toUpperCase();
    const idColIdx = findColumnIndex("Id");
    
    if (idColIdx === -1) {
      return ContentService.createTextOutput("Erro: Coluna 'Id' não encontrada na planilha.").setMimeType(ContentService.MimeType.TEXT);
    }
    
    const allData = sheet.getDataRange().getValues();
    let rowToUpdate = -1;
    
    // Busca a linha correta pelo ID
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][idColIdx]).trim().toUpperCase() === idValue) {
        rowToUpdate = i + 1;
        break;
      }
    }

    if (rowToUpdate !== -1) {
      // Itera sobre as chaves enviadas no JSON do frontend
      Object.keys(payload).forEach(key => {
        if (key === "action" || key === "id") return; // Ignora metadados
        
        const colIdx = findColumnIndex(key);
        if (colIdx !== -1) {
          // Grava o valor na célula correspondente (ex: Materiais Extras, NF, etc)
          sheet.getRange(rowToUpdate, colIdx + 1).setValue(payload[key]);
        }
      });
      return ContentService.createTextOutput("Updated").setMimeType(ContentService.MimeType.TEXT);
    }
    
    return ContentService.createTextOutput("ID não encontrado").setMimeType(ContentService.MimeType.TEXT);
  }
}
