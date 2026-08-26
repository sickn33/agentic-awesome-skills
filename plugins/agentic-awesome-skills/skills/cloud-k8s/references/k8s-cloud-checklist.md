# Cloud / K8s 检查清单（精简）

## IMDS
- [ ] SSRF 是否可达 169.254.169.254
- [ ] 是否强制 IMDSv2
- [ ] 返回的 IAM 角色权限面

## K8s 高危
- [ ] cluster-admin 绑定过多
- [ ] secrets 明文环境变量
- [ ] privileged + hostPID/hostPath 组合
- [ ] 匿名 auth / insecure apiserver 端口

## 容器
- [ ] 以 root 运行
- [ ] 可加载内核模块 / docker.sock 挂载