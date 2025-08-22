import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/generate-config', async (req, res) => {
    const { vendor, deviceType, feature, config } = req.body;

    if (!vendor || !deviceType || !feature || !config) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const scriptPath = path.join(__dirname, 'scripts', 'config_generator.py');
        const configJson = JSON.stringify(config);

        const pythonProcess = spawn('python3', [
            scriptPath,
            '--vendor', vendor,
            '--device-type', deviceType,
            '--feature', feature,
            '--config', configJson
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('Python script error:', errorOutput);
                return res.status(500).json({ 
                    cli: '# Configuration generation failed', 
                    explanation: `脚本执行失败: ${errorOutput}` 
                });
            }

            try {
                const result = JSON.parse(output);
                res.status(200).json(result);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                res.status(500).json({ 
                    cli: '# Failed to parse configuration output', 
                    explanation: '配置输出解析失败' 
                });
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('Failed to start Python process:', error);
            res.status(500).json({ 
                cli: '# Failed to execute configuration generator', 
                explanation: `无法执行配置生成器: ${error.message}` 
            });
        });

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ 
            cli: '# Internal server error', 
            explanation: `服务器内部错误: ${error.message}` 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Config generator API server running on port ${PORT}`);
});

export default app;