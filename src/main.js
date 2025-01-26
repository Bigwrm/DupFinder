import { GPU } from 'gpu.js';
    import * as mammoth from 'mammoth';
    import workerpool from 'workerpool';

    const gpu = new GPU();
    const pool = workerpool.pool();

    document.getElementById('process-btn').addEventListener('click', async () => {
      const files = document.getElementById('file-input').files;
      if (files.length === 0) {
        alert('Please select at least one file');
        return;
      }
      
      try {
        const results = await processFiles(files);
        displayResults(results);
      } catch (error) {
        console.error('Error processing files:', error);
        alert('Error processing files. Check console for details.');
      }
    });

    async function processFiles(files) {
      const tasks = [];
      for (const file of files) {
        tasks.push(processFile(file));
      }
      return await Promise.all(tasks);
    }

    async function processFile(file) {
      const text = await extractText(file);
      const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
      
      if (paragraphs.length === 0) {
        return { file: file.name, results: [] };
      }

      const results = await pool.exec('findSimilarities', [paragraphs]);
      return { file: file.name, results };
    }

    async function extractText(file) {
      if (file.type === 'text/plain') {
        return await file.text();
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return result.value;
      }
      return '';
    }

    function displayResults(results) {
      const container = document.getElementById('results');
      container.innerHTML = results.map(r => `
        <div class="result">
          <h3>${r.file}</h3>
          <pre>${JSON.stringify(r.results, null, 2)}</pre>
        </div>
      `).join('');
    }
