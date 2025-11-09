sdocument.getElementById('importBtn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value;
    const apiToken = document.getElementById('apiToken').value;
    const jsonFile = document.getElementById('jsonFile').files[0];
    const log = document.getElementById('log');

    // Limpa o log
    log.innerHTML = '';
    const logMessage = (message) => {
        log.innerHTML += message + '<br>';
        log.scrollTop = log.scrollHeight; // Auto-scroll
    };

    if (!apiKey || !apiToken || !jsonFile) {
        logMessage('Erro: Preencha todos os campos.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const boardData = JSON.parse(event.target.result);
            const boardName = boardData.name || 'Quadro Importado';

            logMessage(`Iniciando importação para o quadro: "${boardName}"`);

            // 1. Criar o Quadro (Board)
            logMessage('1. Criando o quadro...');
            const boardResponse = await fetch(`https://api.trello.com/1/boards/?name=${encodeURIComponent(boardName)}&key=${apiKey}&token=${apiToken}&defaultLists=false`, {
                method: 'POST'
            });

            if (!boardResponse.ok) throw new Error('Falha ao criar o quadro.');
            
            const newBoard = await boardResponse.json();
            logMessage(` -> Quadro "${newBoard.name}" criado com sucesso! (ID: ${newBoard.id})`);
            
            // 2. Criar as Listas e os Cartões
            const listMap = new Map(); // Para mapear IDs antigos para novos

            for (const list of boardData.lists) {
                logMessage(`2. Criando lista: "${list.name}"...`);
                const listResponse = await fetch(`https://api.trello.com/1/lists?name=${encodeURIComponent(list.name)}&idBoard=${newBoard.id}&key=${apiKey}&token=${apiToken}`, {
                    method: 'POST'
                });

                if (!listResponse.ok) {
                    logMessage(` -> Falha ao criar a lista "${list.name}". Pulando...`);
                    continue;
                }

                const newList = await listResponse.json();
                listMap.set(list.id, newList.id); // Mapeia o ID antigo para o novo
                logMessage(` -> Lista "${newList.name}" criada.`);
            }

            for (const card of boardData.cards) {
                const newIdList = listMap.get(card.idList);
                if (!newIdList) {
                    logMessage(`Aviso: Lista para o cartão "${card.name}" não encontrada. Pulando.`);
                    continue;
                }

                logMessage(`3. Criando cartão: "${card.name}"...`);
                const cardDetails = {
                    name: card.name,
                    desc: card.desc || '',
                    idList: newIdList
                };

                const cardResponse = await fetch(`https://api.trello.com/1/cards?key=${apiKey}&token=${apiToken}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cardDetails)
                });

                if (cardResponse.ok) {
                    logMessage(` -> Cartão "${card.name}" criado.`);
                } else {
                    logMessage(` -> Falha ao criar o cartão "${card.name}".`);
                }
            }

            logMessage('<strong>Importação concluída! 🎉</strong>');
            logMessage(`Acesse seu novo quadro aqui: <a href="${newBoard.url}" target="_blank">Ver Quadro</a>`);

        } catch (error) {
            logMessage(`ERRO GERAL: ${error.message}`);
        }
    };

    reader.readAsText(jsonFile);
});