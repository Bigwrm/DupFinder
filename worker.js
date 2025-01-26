import { GPU } from 'gpu.js';

    const gpu = new GPU();

    function findSimilarities(paragraphs) {
      const similarityKernel = gpu.createKernel(function(a, b) {
        let sum = 0;
        for (let i = 0; i < this.constants.size; i++) {
          sum += Math.abs(a[i] - b[i]);
        }
        return 1 / (1 + sum);
      }).setConstants({ size: 100 });

      const results = [];
      for (let i = 0; i < paragraphs.length; i++) {
        for (let j = i + 1; j < paragraphs.length; j++) {
          const similarity = similarityKernel(
            vectorize(paragraphs[i]),
            vectorize(paragraphs[j])
          );
          if (similarity > 0.8) {
            results.push({
              paragraph1: i,
              paragraph2: j,
              similarity
            });
          }
        }
      }
      return results;
    }

    function vectorize(text) {
      const vector = new Array(100).fill(0);
      const words = text.split(/\s+/);
      words.forEach(word => {
        const hash = Math.abs(hashCode(word)) % 100;
        vector[hash]++;
      });
      return vector;
    }

    function hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    }

    export { findSimilarities };
