// API endpoint for generating network configurations
// This would typically be deployed as a serverless function or Express.js route

const { spawn } = require('child_process');
const path = require('path');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { vendor, deviceType, feature, config } = req.body;

    if (!vendor || !deviceType || !feature || !config) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'config_generator.py');
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
}