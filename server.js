const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { runCrawler } = require('./crawler');

// 读取 .env 文件（如果存在）
try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...vals] = line.trim().split('=');
        if (key && vals.length) process.env[key] = vals.join('=');
    });
} catch (_) {}

let port = Number(process.env.PORT) || 8003;
const MESSAGES_FILE = './messages.json';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// 初始化消息文件
if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2));
}

// 定时任务：每小时自动更新一次数据
const UPDATE_INTERVAL = 60 * 60 * 1000;
setInterval(() => {
    Promise.resolve(runCrawler()).catch(console.error);
}, UPDATE_INTERVAL);

// 启动时先更新一次 (异步)
runCrawler().catch(console.error);

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

process.on('unhandledRejection', (reason) => {
    console.error('UnhandledRejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('UncaughtException:', error);
});

const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    console.log(`[${req.method}] ${requestUrl.pathname}`);
    let filePath = '.' + requestUrl.pathname;
    if (filePath === './') filePath = './index.html';

    // API 路由处理
    if (requestUrl.pathname === '/api/ai-chat') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const { message, userInfo, competitions } = JSON.parse(body);

                    // 构建发送给DeepSeek的prompt
                    const systemPrompt = `你是武汉大学校园竞赛推荐助手。根据学生的信息和当前可用的竞赛列表，为学生推荐最合适的竞赛。

可用竞赛列表：
${JSON.stringify(competitions, null, 2)}

请根据学生的学院、年级、兴趣等信息，从上述竞赛列表中推荐最合适的3-5个竞赛，并说明推荐理由。回答要简洁、友好、有针对性。`;

                    const userPrompt = `学生信息：${JSON.stringify(userInfo)}
学生问题：${message}`;

                    // 调用DeepSeek API
                    const postData = JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 2000
                    });

                    const options = {
                        hostname: 'api.deepseek.com',
                        port: 443,
                        path: '/v1/chat/completions',
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                            'Content-Length': Buffer.byteLength(postData)
                        }
                    };

                    const apiReq = https.request(options, (apiRes) => {
                        let responseData = '';
                        apiRes.on('data', chunk => responseData += chunk);
                        apiRes.on('end', () => {
                            try {
                                const result = JSON.parse(responseData);
                                if (result.choices && result.choices[0]) {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({
                                        success: true,
                                        reply: result.choices[0].message.content
                                    }));
                                } else {
                                    res.writeHead(500, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ success: false, error: 'Invalid API response' }));
                                }
                            } catch (e) {
                                console.error('Parse error:', e);
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, error: 'Failed to parse API response' }));
                            }
                        });
                    });

                    apiReq.on('error', (e) => {
                        console.error('API request error:', e);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: e.message }));
                    });

                    apiReq.write(postData);
                    apiReq.end();

                } catch (e) {
                    console.error('Request error:', e);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
                }
            });
            return;
        }
        res.writeHead(405);
        res.end('Method not allowed');
        return;
    }

    if (requestUrl.pathname === '/api/messages') {
        if (req.method === 'GET') {
            fs.readFile(MESSAGES_FILE, (err, data) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                if (err) {
                    res.end('[]');
                    return;
                }
                res.end(data || '[]');
            });
            return;
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
                try {
                    const newMessage = JSON.parse(body);
                    newMessage.id = Date.now();
                    newMessage.time = new Date().toLocaleString();

                    const raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
                    const messages = JSON.parse(raw && raw.trim().length ? raw : '[]');
                    messages.unshift(newMessage);
                    // 只保留最近 50 条消息
                    const trimmedMessages = messages.slice(0, 50);
                    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(trimmedMessages, null, 2));

                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: newMessage }));
                } catch (e) {
                    res.writeHead(400);
                    res.end('Invalid JSON');
                }
            });
            return;
        }

        res.writeHead(405);
        res.end('Method not allowed');
        return;
    }

    if (requestUrl.pathname === '/api/stats') {
        fs.readFile('./competitions.json', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading stats');
                return;
            }
            const parsed = JSON.parse(data);
            const comps = Array.isArray(parsed.data) ? parsed.data : [];
            const stats = {
                byType: {},
                byCategory: {},
                bySource: {},
                timeline: {}
            };

            comps.forEach(c => {
                const type = c && typeof c.type === 'string' ? c.type : 'competition';
                stats.byType[type] = (stats.byType[type] || 0) + 1;
                stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1;
                stats.bySource[c.source] = (stats.bySource[c.source] || 0) + 1;
                const month = typeof c.date === 'string' ? c.date.substring(0, 7) : '';
                if (month && month.length === 7) {
                    stats.timeline[month] = (stats.timeline[month] || 0) + 1;
                }
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(stats));
        });
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.on('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
        port += 1;
        server.listen(port);
        return;
    }
    console.error('Server error:', error);
});

server.on('listening', () => {
    console.log(`Server running at http://localhost:${port}/`);
});

server.listen(port);
