// 全局变量
let operatorsData = [];
let selectedOperators = [];
let operatorImages = {}; // 缓存已加载的图片

// DOM元素
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const loadBtn = document.getElementById('load-btn');
const selectBtn = document.getElementById('select-btn');
const saveBtn = document.getElementById('save-btn');
const clearBtn = document.getElementById('clear-btn');
const fileName = document.getElementById('file-name');
const operatorCount = document.getElementById('operator-count');
const operatorsGrid = document.getElementById('operators-grid');
const jsonOutput = document.getElementById('json-output');
const selectedCount = document.getElementById('selected-count');
const sixStarCount = document.getElementById('six-star-count');
const dropArea = document.getElementById('drop-area');
const levelWeightCheckbox = document.getElementById('level-weight');
const ignoreLevel1Checkbox = document.getElementById('ignore-level1');
const loader = document.getElementById('loader');

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 文件选择
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖放功能
    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('drop', handleFileDrop);
    
    // 按钮事件
    loadBtn.addEventListener('click', loadOperatorsData);
    selectBtn.addEventListener('click', selectRandomOperators);
    saveBtn.addEventListener('click', saveResultAsJson);
    clearBtn.addEventListener('click', clearResults);
});

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        loadBtn.disabled = false;
        
        // 预览文件内容
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                operatorCount.textContent = data.length;
            } catch (error) {
                showError('文件格式错误，请确保是有效的JSON文件');
                loadBtn.disabled = true;
            }
        };
        reader.readAsText(file);
    }
}

// 处理拖放
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.style.borderColor = 'rgba(77, 204, 189, 0.6)';
    dropArea.style.backgroundColor = 'rgba(77, 204, 189, 0.05)';
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.style.borderColor = 'rgba(77, 204, 189, 0.3)';
    dropArea.style.backgroundColor = 'transparent';
    
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
        fileInput.files = event.dataTransfer.files;
        fileName.textContent = file.name;
        loadBtn.disabled = false;
        
        // 预览文件内容
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                operatorCount.textContent = data.length;
            } catch (error) {
                showError('文件格式错误，请确保是有效的JSON文件');
                loadBtn.disabled = true;
            }
        };
        reader.readAsText(file);
    } else {
        showError('请拖放JSON文件');
    }
}

// 加载干员数据
function loadOperatorsData() {
    const file = fileInput.files[0];
    if (!file) {
        showError('请先选择文件');
        return;
    }
    
    showLoader();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            operatorsData = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (!Array.isArray(operatorsData)) {
                throw new Error('JSON数据必须是数组格式');
            }
            
            // 过滤掉未拥有的干员
            operatorsData = operatorsData.filter(op => op.own !== false);
            
            // 检查必要字段
            const requiredFields = ['id', 'name', 'elite', 'level', 'rarity'];
            const missingFields = [];
            
            operatorsData.forEach((op, index) => {
                requiredFields.forEach(field => {
                    if (op[field] === undefined) {
                        missingFields.push(`干员 ${op.name || '未知'} (索引 ${index}) 缺少字段: ${field}`);
                    }
                });
            });
            
            if (missingFields.length > 0) {
                console.warn('数据格式警告:', missingFields);
            }
            
            operatorCount.textContent = operatorsData.length;
            selectBtn.disabled = operatorsData.length < 12;
            
            if (operatorsData.length < 12) {
                showError(`干员数量不足12个（当前：${operatorsData.length}）`);
            } else {
                showSuccess(`成功加载 ${operatorsData.length} 个干员数据！`);
            }
            
            // 预加载所有干员图片到缓存
            preloadOperatorImages();
            
        } catch (error) {
            console.error('解析JSON时出错:', error);
            showError(`解析JSON时出错: ${error.message}`);
            operatorsData = [];
            operatorCount.textContent = '0';
            selectBtn.disabled = true;
        } finally {
            hideLoader();
        }
    };
    
    reader.onerror = function() {
        showError('读取文件时出错');
        hideLoader();
    };
    
    reader.readAsText(file);
}

// 预加载干员图片
function preloadOperatorImages() {
    operatorsData.forEach(operator => {
        // 根据elite值决定使用哪张图片
        const eliteNum = operator.elite === 2 ? 2 : 1;
        const imageName = `半身像_${operator.name}_${eliteNum}.png`;
        const img = new Image();
        img.src = `assets/images/${imageName}`;
        img.onerror = function() {
            // 如果精英2图片不存在，回退到精英1图片
            if (eliteNum === 2) {
                const fallbackImageName = `半身像_${operator.name}_1.png`;
                img.src = `assets/images/${fallbackImageName}`;
                img.onerror = function() {
                    console.warn(`图片加载失败: ${operator.name}`);
                };
            } else {
                console.warn(`图片加载失败: ${operator.name}`);
            }
        };
        operatorImages[operator.name] = img;
    });
}

// 随机抽取干员
function selectRandomOperators() {
    if (operatorsData.length < 12) {
        showError(`干员数量不足12个（当前：${operatorsData.length}）`);
        return;
    }
    
    // 应用过滤条件
    let filteredData = [...operatorsData];
    
    // 忽略精英0级且等级为1的干员
    if (ignoreLevel1Checkbox.checked) {
        filteredData = filteredData.filter(op => !(op.elite === 0 && op.level === 1));
    }
    
    if (filteredData.length < 12) {
        showError(`应用过滤条件后干员数量不足12个（当前：${filteredData.length}）`);
        return;
    }
    
    // 随机选择12个不重复的干员
    selectedOperators = [];
    
    if (levelWeightCheckbox.checked) {
        // 使用权重抽取
        selectedOperators = selectWithWeight(filteredData, 12);
    } else {
        // 简单随机抽取
        selectedOperators = selectSimpleRandom(filteredData, 12);
    }
    
    // 为每个干员确定技能
    selectedOperators.forEach(op => {
        op.selectedSkill = determineSkill(op);
    });
    
    // 更新UI
    updateResultsDisplay();
    updateJsonPreview();
    updateStats();
    
    saveBtn.disabled = false;
    clearBtn.disabled = false;
    
    showSuccess('成功抽取12名干员！');
}

// 权重抽取
function selectWithWeight(data, count) {
    // 计算每个干员的权重
    const weightedData = data.map(op => {
        let weight = op.level;
        
        // 根据精英化和稀有度增加权重
        if (op.rarity === 6) {
            weight += op.elite === 2 ? 130 : 50;
        } else if (op.rarity === 5) {
            weight += op.elite === 2 ? 120 : 50;
        } else if (op.rarity === 4) {
            weight += op.elite === 2 ? 105 : 45;
        } else if (op.rarity === 3) {
            weight += op.elite === 1 ? 40 : 0;
        }
        
        return { operator: op, weight: weight };
    });
    
    // 按权重排序（权重高的在前）
    weightedData.sort((a, b) => b.weight - a.weight);
    
    // 选择前count个（权重高的干员有更高概率被选中）
    const selected = [];
    const usedIndices = new Set();
    
    while (selected.length < count && selected.length < weightedData.length) {
        // 使用权重决定选择概率
        const available = weightedData.filter((_, idx) => !usedIndices.has(idx));
        const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
        
        let random = Math.random() * totalWeight;
        let selectedIndex = -1;
        
        for (let i = 0; i < available.length; i++) {
            random -= available[i].weight;
            if (random <= 0) {
                selectedIndex = weightedData.indexOf(available[i]);
                break;
            }
        }
        
        if (selectedIndex !== -1) {
            usedIndices.add(selectedIndex);
            selected.push(weightedData[selectedIndex].operator);
        }
    }
    
    return selected;
}

// 简单随机抽取
function selectSimpleRandom(data, count) {
    // 使用Fisher-Yates洗牌算法
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, count);
}

// 确定技能等级
function determineSkill(operator) {
    const rarity = operator.rarity;
    const elite = operator.elite;
    
    if (rarity === 6 && elite === 2) {
        return Math.floor(Math.random() * 3) + 1; // 1-3
    } else if (rarity <= 3 || elite === 1) {
        return 1; // 固定为1
    } else {
        return Math.floor(Math.random() * 2) + 1; // 1-2
    }
}

// 更新结果显示
function updateResultsDisplay() {
    operatorsGrid.innerHTML = '';
    
    if (selectedOperators.length === 0) {
        operatorsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>加载数据后点击"随机抽取"开始选择干员</p>
            </div>
        `;
        return;
    }
    
    selectedOperators.forEach((operator, index) => {
        // 根据elite值决定使用哪张图片
        const eliteNum = operator.elite === 2 ? 2 : 1;
        const imageName = `半身像_${operator.name}_${eliteNum}.png`;
        const imagePath = `assets/images/${imageName}`;
        
        // 检查图片是否已缓存
        const cachedImg = operatorImages[operator.name];
        let imageUrl;
        
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth !== 0) {
            imageUrl = cachedImg.src;
        } else {
            // 使用占位符
            imageUrl = `data:image/svg+xml;base64,${btoa(`
                <svg width="180" height="240" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#1a1a2e"/>
                    <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#8080a0" text-anchor="middle" dy=".3em">
                        ${operator.name}
                    </text>
                </svg>
            `)}`;
        }
        
        const card = document.createElement('div');
        card.className = 'operator-card';
        
        // 根据稀有度设置边框颜色
        const rarityClass = `rarity-${operator.rarity}`;
        card.classList.add(rarityClass);
        
        // 生成星级显示
        const stars = '★'.repeat(operator.rarity);
        
        card.innerHTML = `
            <div class="operator-image" style="background-image: url('${imageUrl}')">
                <!-- 移除了图片中的技能徽章 -->
            </div>
            <div class="operator-info">
                <div class="operator-header">
                    <div class="operator-name">${operator.name}</div>
                    <div class="rarity-stars">${stars}</div>
                    <div class="skill-badge skill-${operator.selectedSkill}">${operator.selectedSkill}</div>
                </div>
                <div class="operator-details">
                    <span class="detail-item">精英${operator.elite}</span>
                    <span class="detail-item">Lv.${operator.level}</span>
                </div>
            </div>
        `;
        
        operatorsGrid.appendChild(card);
    });
}

// 更新统计信息
function updateStats() {
    selectedCount.textContent = selectedOperators.length;
    
    const sixStars = selectedOperators.filter(op => op.rarity === 6).length;
    sixStarCount.textContent = sixStars;
}

// 更新JSON预览
function updateJsonPreview() {
    const result = {
        "stage_name": "1-7",
        "minimum_required": "v4.0.0",
        "doc": {
            "title": "随机抽取干员配置",
            "details": `由工具于 ${new Date().toLocaleString('zh-CN')} 随机生成，共${selectedOperators.length}名干员`
        },
        "opers": selectedOperators.map(op => ({
            "name": op.name,
            "skill": op.selectedSkill,
            "requirements": {}
        })),
        "groups": [],
        "actions": [],
        "version": 3,
        "difficulty": 3
    };
    
    jsonOutput.textContent = JSON.stringify(result, null, 2);
}

// 保存结果为JSON文件
function saveResultAsJson() {
    if (selectedOperators.length === 0) {
        showError('没有可保存的结果，请先抽取干员');
        return;
    }
    
    const result = {
        "stage_name": "1-7",
        "minimum_required": "v4.0.0",
        "doc": {
            "title": "随机抽取干员配置",
            "details": `由工具于 ${new Date().toLocaleString('zh-CN')} 随机生成，共${selectedOperators.length}名干员`
        },
        "opers": selectedOperators.map(op => ({
            "name": op.name,
            "skill": op.selectedSkill,
            "requirements": {}
        })),
        "groups": [],
        "actions": [],
        "version": 3,
        "difficulty": 3
    };
    
    const jsonStr = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `arknights_selection_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
    
    showSuccess('结果已保存为JSON文件！');
}

// 清除结果
function clearResults() {
    selectedOperators = [];
    updateResultsDisplay();
    updateJsonPreview();
    updateStats();
    saveBtn.disabled = true;
    clearBtn.disabled = true;
}

// 显示/隐藏加载动画
function showLoader() {
    loader.style.display = 'flex';
}

function hideLoader() {
    loader.style.display = 'none';
}

// 显示成功消息
function showSuccess(message) {
    alertify.success(message, 3);
}

// 显示错误消息
function showError(message) {
    alertify.error(message, 5);
}

// 初始化alertify
(function initAlertify() {
    // 简单替代alertify的轻量级通知
    const style = document.createElement('style');
    style.textContent = `
        .custom-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 9999;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            max-width: 300px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        
        .notification-success {
            background: linear-gradient(135deg, #06d6a0 0%, #05b88a 100%);
            border-left: 4px solid #04a87a;
        }
        
        .notification-error {
            background: linear-gradient(135deg, #ef476f 0%, #d43a5f 100%);
            border-left: 4px solid #c02d4f;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    window.alertify = {
        success: function(message, duration = 3000) {
            const notification = document.createElement('div');
            notification.className = 'custom-notification notification-success';
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, duration);
        },
        
        error: function(message, duration = 5000) {
            const notification = document.createElement('div');
            notification.className = 'custom-notification notification-error';
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, duration);
        }
    };
})();

// 初始化页面
(function initPage() {
    // 设置文件拖放区域的默认文本
    dropArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt upload-icon"></i>
        <p>拖放您的JSON文件到此区域，或点击选择文件</p>
        <input type="file" id="file-input" accept=".json">
        <button class="btn" id="browse-btn">选择文件</button>
    `;
    
    // 初始JSON预览
    updateJsonPreview();
})();