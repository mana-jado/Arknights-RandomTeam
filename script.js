// 全局变量
let operatorsData = [];
let selectedOperators = [];
let operatorImages = {}; // 缓存已加载的图片

// DOM元素
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
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
const loadStatusText = document.getElementById('load-status-text'); // 3.1: 添加状态显示元素

// 3.1: 添加状态更新函数
function updateLoadStatus(message, type = 'info') {
    if (loadStatusText) {
        loadStatusText.textContent = message;
        loadStatusText.className = '';
        
        switch (type) {
            case 'success':
                loadStatusText.classList.add('load-success');
                break;
            case 'error':
                loadStatusText.classList.add('load-error');
                break;
            case 'warning':
                loadStatusText.classList.add('load-warning');
                break;
            default:
                // 保持默认样式
                break;
        }
    }
}

// 加载默认全图鉴数据
async function loadDefaultData() {
    try {
        updateLoadStatus('正在加载默认全图鉴数据...', 'info');
        console.log("正在加载默认全图鉴数据...");
        
        // 尝试从服务器根目录加载 default_operators.json
        const response = await fetch('default_operators.json');
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
        }
        
        operatorsData = await response.json();
        
        // 验证数据格式
        if (!Array.isArray(operatorsData)) {
            throw new Error('默认数据格式错误：不是有效的数组格式');
        }
        
        // 确保每个干员都有正确的字段
        const requiredFields = ['id', 'name', 'elite', 'level', 'rarity'];
        const validOperators = [];
        
        for (const op of operatorsData) {
            // 检查必要字段
            let isValid = true;
            for (const field of requiredFields) {
                if (op[field] === undefined) {
                    console.warn(`干员数据缺少字段 "${field}":`, op);
                    isValid = false;
                    break;
                }
            }
            
            if (isValid) {
                // 确保own和potential字段存在
                if (op.own === undefined) op.own = true;
                if (op.potential === undefined) op.potential = 6;
                validOperators.push(op);
            }
        }
        
        operatorsData = validOperators;
        
        if (operatorsData.length === 0) {
            throw new Error('默认数据中没有有效的干员信息');
        }
        
        // 预加载所有干员图片到缓存
        // preloadOperatorImages();
        
        // 更新UI
        operatorCount.textContent = operatorsData.length;
        fileName.textContent = "默认全图鉴数据";
        selectBtn.disabled = operatorsData.length < 12;
        
        if (operatorsData.length < 12) {
            const message = `默认数据中干员数量不足12个（当前：${operatorsData.length}）`;
            updateLoadStatus(message, 'warning');
            showError(message);
        } else {
            const message = `成功加载默认全图鉴数据！共 ${operatorsData.length} 个干员`;
            updateLoadStatus(message, 'success');
            showSuccess(message);
            
            // 自动抽取一次
            setTimeout(() => {
                selectRandomOperators();
            }, 500);
        }
        
    } catch (error) {
        console.error('加载默认数据失败:', error);
        const message = `加载默认数据失败: ${error.message}`;
        updateLoadStatus(message, 'error');
        showError(message);
        
        // 回退到空数据
        operatorsData = [];
        operatorCount.textContent = '0';
        selectBtn.disabled = true;
        fileName.textContent = "加载默认数据失败";
        
    } finally {
        // 不需要隐藏加载器，因为页面初始化时没有显示加载器
    }
}

// 3.2: 处理文件选择 - 修改为自动加载
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        updateLoadStatus('正在加载数据...', 'info');
        
        // 自动加载文件
        loadOperatorsDataFromFile(file);
    }
}

// 3.2: 处理文件拖放 - 修改为自动加载
function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.style.borderColor = 'rgba(77, 204, 189, 0.3)';
    dropArea.style.backgroundColor = 'transparent';
    
    const file = event.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
        fileInput.files = event.dataTransfer.files;
        fileName.textContent = file.name;
        updateLoadStatus('正在加载数据...', 'info');
        
        // 自动加载文件
        loadOperatorsDataFromFile(file);
    } else {
        showError('请拖放JSON文件');
    }
}

// 3.3: 从文件加载干员数据 - 自动调用版本
function loadOperatorsDataFromFile(file) {
    showLoader();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 验证数据格式
            if (!Array.isArray(data)) {
                throw new Error('JSON数据必须是数组格式');
            }
            
            // 过滤掉未拥有的干员
            operatorsData = data.filter(op => op.own !== false);
            
            // 检查必要字段
            const requiredFields = ['id', 'name', 'elite', 'level', 'rarity'];
            const missingFields = [];
            const validOperators = [];
            
            operatorsData.forEach((op, index) => {
                let isValid = true;
                requiredFields.forEach(field => {
                    if (op[field] === undefined) {
                        missingFields.push(`干员 ${op.name || '未知'} (索引 ${index}) 缺少字段: ${field}`);
                        isValid = false;
                    }
                });
                
                if (isValid) {
                    // 确保own和potential字段存在
                    if (op.own === undefined) op.own = true;
                    if (op.potential === undefined) op.potential = 6;
                    validOperators.push(op);
                }
            });
            
            operatorsData = validOperators;
            
            if (missingFields.length > 0) {
                console.warn('数据格式警告:', missingFields);
                updateLoadStatus(`数据加载完成，但有${missingFields.length}个格式警告`, 'warning');
            }
            
            operatorCount.textContent = operatorsData.length;
            selectBtn.disabled = operatorsData.length < 12;
            
            if (operatorsData.length < 12) {
                const message = `干员数量不足12个（当前：${operatorsData.length}）`;
                updateLoadStatus(message, 'warning');
                showError(message);
            } else {
                const message = `成功加载 ${operatorsData.length} 个干员数据！已覆盖默认数据。`;
                updateLoadStatus(message, 'success');
                showSuccess(message);
            }
            
            // 预加载所有干员图片到缓存
            // preloadOperatorImages();
            
            // 自动抽取一次
            setTimeout(() => {
                selectRandomOperators();
            }, 500);
            
        } catch (error) {
            console.error('解析JSON时出错:', error);
            const message = `解析JSON时出错: ${error.message}`;
            updateLoadStatus(message, 'error');
            showError(message);
            operatorsData = [];
            operatorCount.textContent = '0';
            selectBtn.disabled = true;
        } finally {
            hideLoader();
        }
    };
    
    reader.onerror = function() {
        const message = '读取文件时出错';
        updateLoadStatus(message, 'error');
        showError(message);
        hideLoader();
    };
    
    reader.readAsText(file);
}

function loadOperatorImage(operator, callback) {
    const eliteNum = operator.elite === 2 ? 2 : 1;
    
    // 检查缓存
    if (operatorImages[operator.name] && operatorImages[operator.name].complete) {
        callback(operatorImages[operator.name].src);
        return;
    }
    
    // 创建统一的图片加载函数
    const tryLoadImage = (imageName, isFallback = false) => {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = function() {
                if (!isFallback) {
                    operatorImages[operator.name] = img;
                }
                resolve({ success: true, img: img });
            };
            
            img.onerror = function() {
                resolve({ success: false });
            };
            
            const isWebP = imageName.endsWith('.webp');
            const baseDir = isWebP ? 'assets/small_images/' : 'assets/images/';
            img.src = baseDir + imageName;
        });
    };
    
    // 定义尝试加载的顺序
    const loadSequence = [
        `半身像_${operator.name}_${eliteNum}.webp`,     // 1. 首选: WebP格式
        `半身像_${operator.name}_${eliteNum}.png`,      // 2. 备选: PNG格式
    ];
    
    // 如果是精英2，添加精英1的回退选项
    if (eliteNum === 2) {
        loadSequence.push(
            `半身像_${operator.name}_1.webp`,           // 3. 回退: 精英1的WebP
            `半身像_${operator.name}_1.png`             // 4. 回退: 精英1的PNG
        );
    }
    
    // 顺序尝试加载
    const attemptLoad = async (index = 0) => {
        if (index >= loadSequence.length) {
            // 所有格式都失败，使用占位符
            callback(getPlaceholderImage(operator));
            return;
        }
        
        const imageName = loadSequence[index];
        const isFallback = index >= 2; // 前两个是首选格式
        
        const result = await tryLoadImage(imageName, isFallback);
        
        if (result.success) {
            callback(result.img.src);
        } else {
            // 当前格式失败，尝试下一个
            attemptLoad(index + 1);
        }
    };
    
    // 开始加载流程
    attemptLoad();
}

function getPlaceholderImage(operator) {
    // 使用 encodeURIComponent 处理中文
    const svg = `<svg width="180" height="240" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <rect x="0" y="0" width="100%" height="20" fill="#2a2a3a"/>
        <text x="50%" y="50%" font-family="Arial" font-size="16" fill="#8080a0" text-anchor="middle" dy=".3em">
            ${operator.name}
        </text>
    </svg>`;
    
    // 使用 encodeURIComponent 而不是 btoa
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

// 3.4: 修改现有的加载干员数据函数（可选保留，但不再使用）
// 注意：这个函数现在不会被调用，但可以保留作为备份
function loadOperatorsData() {
    const file = fileInput.files[0];
    if (!file) {
        showError('请先选择文件');
        return;
    }
    
    loadOperatorsDataFromFile(file);
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    // 文件选择
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // 拖放功能
    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('drop', handleFileDrop);
    
    // 3.5: 移除原加载按钮事件监听，保留其他按钮事件
    // loadBtn.removeEventListener('click', loadOperatorsData);
    
    // 其他按钮事件
    selectBtn.addEventListener('click', selectRandomOperators);
    saveBtn.addEventListener('click', saveResultAsJson);
    clearBtn.addEventListener('click', clearResults);
});

// 处理拖放
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    dropArea.style.borderColor = 'rgba(77, 204, 189, 0.6)';
    dropArea.style.backgroundColor = 'rgba(77, 204, 189, 0.05)';
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
    
    // 按照指定规则排序：elite降序 -> level降序 -> rarity降序
    selectedOperators.sort((a, b) => {
        // 1. 先按elite排序（数值越大越靠前）
        if (b.elite !== a.elite) {return b.elite - a.elite;}
        // 2. elite相同则按level排序（数值越大越靠前）
        if (b.level !== a.level) {return b.level - a.level;}
        // 3. level相同则按rarity排序（数值越大越靠前）
        if (b.rarity !== a.rarity) {return b.rarity - a.rarity;}
        // 4. 所有条件都相同，保持原顺序
        return 0;
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
        const card = document.createElement('div');
        card.className = 'operator-card';
        card.dataset.index = index;
        
        // 根据稀有度设置边框颜色
        const rarityClass = `rarity-${operator.rarity}`;
        card.classList.add(rarityClass);
        
        // 生成星级显示
        const stars = '★'.repeat(operator.rarity);
        
        // 先创建卡片结构，使用占位符
        card.innerHTML = `
            <div class="operator-image" id="img-${index}" style="background-image: url('${getPlaceholderImage(operator)}')">
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
        
        // 异步加载图片
        setTimeout(() => {
            loadOperatorImage(operator, (imageUrl) => {
                const imgElement = document.getElementById(`img-${index}`);
                if (imgElement) {
                    imgElement.style.backgroundImage = `url('${imageUrl}')`;
                }
            });
        }, index * 50); // 延迟加载，避免同时发起太多请求
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

// 3.6: 修改页面初始化
(function initPage() {
    // 设置文件拖放区域的默认文本
    dropArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt upload-icon"></i>
        <p>通过MAA-小工具-干员识别</p>
        <p>得到自己的干员box数据</p>
        <p>MAA文件夹/data/OperBoxData.json</p>
        <p>拖放文件到此，或点击选择文件</p>
        <p class="default-data-info"><i class="fas fa-star"></i> 已自动加载默认全图鉴数据</p>
        <input type="file" id="file-input" accept=".json">
        <button class="btn" id="browse-btn">选择文件</button>
    `;
    
    // 初始JSON预览
    updateJsonPreview();
    
    // 初始化加载状态
    if (loadStatusText) {
        updateLoadStatus('正在初始化...', 'info');
    }
    
    // 自动加载默认数据
    setTimeout(() => {
        loadDefaultData();
    }, 500); // 稍微延迟加载，让页面先完全渲染
})();