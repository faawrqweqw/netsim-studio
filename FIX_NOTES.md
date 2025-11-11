# 修复说明：配置巡检凭证访问错误

## 问题描述
在设备管理中添加设备后，SSH测试连接通过。但是点击"配置巡检"时，报错：
```
Request Failed
Cannot read properties of undefined (reading 'username')
```

## 根本原因
项目中存在数据结构不一致的问题：

1. **类型定义**（`types.ts` 中的 `ManagementConfig`）：
   ```typescript
   interface ManagementConfig {
     ipAddress: string;
     credentials: {
       username: string;
       password: string;
     };
   }
   ```

2. **实际使用**：某些组件和服务器代码直接访问 `device.management.username`、`device.management.password` 等，而不是 `device.management.credentials.username` 等。

3. **数据保存错误**（`EnhancedDeviceManagement.tsx` 第80行原始代码）：
   ```typescript
   // 错误的方式：将 credentials 对象展开到 management 级别
   management: { ...DEFAULT_MANAGEMENT_CONFIG.credentials, ...device.management }
   ```
   这导致结构混乱，`credentials` 属性可能变为 `undefined`。

## 修复列表

### 1. `EnhancedDeviceManagement.tsx`
- **第32行**：修复 `formData` 初始化，改为正确的 `credentials` 结构
- **第80-83行**：修复 `handleSave` 中设备保存逻辑，确保 `management` 结构正确
- **第98-101行**：在 `handleTestConnection` 中添加凭证验证，防止 `undefined` 错误
- **第107行**：修复端口访问方式为 `device.management.credentials?.port || 22`
- **第109-110行**：修复用户名和密码访问方式
- **第136行**：修复批量备份中的端口访问方式
- **第138-139行**：修复批量备份中的凭证访问方式
- **第252行**：修复CSV导入时的 `management` 结构
- **第283行**：修复 `resetForm` 中的 `management` 结构
- **第443行、445-446行**：修复表单中SSH端口字段的值和更新方式
- **第469、471-472行**：修复表单中用户名字段的值和更新方式
- **第482、484-485行**：修复表单中密码字段的值和更新方式
- **第592行**：修复表格显示中的端口字段

### 2. `DeviceFormModal.tsx`
- **第68行**：修复 `handleManagementChange` 中的凭证处理逻辑
- **第121行**：修复用户名输入字段的值引用
- **第124行**：修复密码输入字段的值引用

### 3. `DeviceInspectionView.tsx`
- **第553-557行**：添加设备凭证验证，检查 `username` 和 `password` 是否存在
- **第641-642行**：修复巡检请求中的凭证访问方式，使用可选链操作符（`?.`）防止 `undefined` 错误

### 4. `server.ts`
- **第1499-1501行**：修复定时备份任务中的凭证访问方式

## 技术改进点

1. **数据结构一致性**：确保所有代码都遵循 `ManagementConfig` 类型定义，凭证信息存储在 `credentials` 嵌套对象中
2. **防御性编程**：使用可选链操作符（`?.`）和默认值（`||`）防止 `undefined` 错误
3. **验证机制**：在执行需要凭证的操作前，先验证凭证是否完整

## 测试步骤

1. **添加设备**：
   - 在"设备管理"中添加一台新设备
   - 输入IP地址、用户名、密码等信息
   - 保存设备

2. **测试连接**：
   - 点击设备列表中的"测试"按钮
   - 验证连接测试成功

3. **配置巡检**：
   - 进入"配置巡检"页面
   - 选择已添加的设备
   - 选择巡检内容
   - 点击"开始巡检"按钮
   - 验证巡检成功执行，无错误

## 注意事项

- 确保所有设备在添加时都填写了完整的SSH凭证（用户名和密码）
- 如果升级之前创建的设备存在数据格式不一致，编辑并重新保存即可修复
- 建议在后续开发中使用 TypeScript 的类型系统来避免类似问题
