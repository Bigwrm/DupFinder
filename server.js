import express from 'express';
    import path from 'path';
    import { fileURLToPath } from 'url';
    import * as mammoth from 'mammoth';

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const app = express();
    const port = 3000;

    app.use(express.static('public'));
    app.use(express.json({ limit: '10mb' }));

    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.post('/process', async (req, res) => {
      try {
        const { file, type } = req.body;
        
        if (!file || !type) {
          return res.status(400).json({ error: 'Missing file data' });
        }

        let text = '';
        const buffer = Buffer.from(file, 'base64');

        if (type === 'text/plain') {
          text = buffer.toString('utf-8');
        } else if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.extractRawText({ buffer });
          text = result.value;
        } else {
          return res.status(400).json({ error: 'Unsupported file type' });
        }

        const paragraphs = text.split('\n\n').filter(p => p.trim() !== '');
        const results = findSimilarParagraphs(paragraphs);

        // Group results by similarity
        const groupedResults = groupSimilarParagraphs(results);

        res.json({ results: groupedResults });
      } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: 'Failed to process file', details: error.message });
      }
    });

    function findSimilarParagraphs(paragraphs) {
      const results = [];
      const similarityThreshold = 0.7;

      for (let i = 0; i < paragraphs.length; i++) {
        for (let j = i + 1; j < paragraphs.length; j++) {
          const similarity = calculateSimilarity(paragraphs[i], paragraphs[j]);
          if (similarity >= similarityThreshold) {
            results.push({
              paragraph1: i + 1,
              paragraph2: j + 1,
              similarity: Math.round(similarity * 100),
              text1: paragraphs[i],
              text2: paragraphs[j]
            });
          }
        }
      }

      return results;
    }

    function groupSimilarParagraphs(results) {
      const groups = new Map();

      results.forEach(result => {
        const key = `${result.similarity}-${result.text1}`;
        if (!groups.has(key)) {
          groups.set(key, {
            similarity: result.similarity,
            mainParagraph: result.paragraph1,
            mainText: result.text1,
            similarParagraphs: new Map() // Use Map to prevent duplicates
          });
        }

        // Add both paragraphs to the group if they're similar
        if (!groups.get(key).similarParagraphs.has(result.paragraph1)) {
          groups.get(key).similarParagraphs.set(result.paragraph1, result.text1);
        }
        if (!groups.get(key).similarParagraphs.has(result.paragraph2)) {
          groups.get(key).similarParagraphs.set(result.paragraph2, result.text2);
        }
      });

      // Convert Map to array and sort by similarity
      return Array.from(groups.values()).map(group => ({
        ...group,
        similarParagraphs: Array.from(group.similarParagraphs.entries())
          .filter(([paragraph]) => paragraph !== group.mainParagraph) // Exclude main paragraph
          .map(([paragraph, text]) => ({ paragraph, text }))
      })).sort((a, b) => b.similarity - a.similarity);
    }

    function calculateSimilarity(text1, text2) {
      const words1 = text1.toLowerCase().split(/\s+/);
      const words2 = text2.toLowerCase().split(/\s+/);
      
      const uniqueWords = new Set([...words1, ...words2]);
      const vector1 = Array.from(uniqueWords).map(word => words1.includes(word) ? 1 : 0);
      const vector2 = Array.from(uniqueWords).map(word => words2.includes(word) ? 1 : 0);

      const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
      const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
      const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

      return dotProduct / (magnitude1 * magnitude2);
    }

    app.listen(port, () => {
      console.log(`Document Processor running at http://localhost:${port}`);
    });
