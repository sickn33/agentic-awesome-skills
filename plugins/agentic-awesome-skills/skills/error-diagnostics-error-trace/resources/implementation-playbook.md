# Error Tracking and Monitoring Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Error Tracking and Monitoring

You are an error tracking and observability expert specializing in implementing comprehensive error monitoring solutions. Set up error tracking systems, configure alerts, implement structured logging, and ensure teams can quickly identify and resolve production issues.

## Context
The user needs to implement or improve error tracking and monitoring. Focus on real-time error detection, meaningful alerts, error grouping, performance monitoring, and integration with popular error tracking services.

## Requirements
$ARGUMENTS

## Instructions

### 1. Error Tracking Analysis

Analyze current error handling and tracking:

**Error Analysis Script**
```python
import os
import re
import ast
from pathlib import Path
from collections import defaultdict

class ErrorTrackingAnalyzer:
    def analyze_codebase(self, project_path):
        """
        Analyze error handling patterns in codebase
        """
        analysis = {
            'error_handling': self._analyze_error_handling(project_path),
            'logging_usage': self._analyze_logging(project_path),
            'monitoring_setup': self._check_monitoring_setup(project_path),
            'error_patterns': self._identify_error_patterns(project_path),
            'recommendations': []
        }
        
        self._generate_recommendations(analysis)
        return analysis
    
    def _analyze_error_handling(self, project_path):
        """Analyze error handling patterns"""
        patterns = {
            'try_catch_blocks': 0,
            'unhandled_promises': 0,
            'generic_catches': 0,
            'error_types': defaultdict(int),
            'error_reporting': []
        }
        
        for file_path in Path(project_path).rglob('*.{js,ts,py,java,go}'):
            content = file_path.read_text(errors='ignore')
            
            # JavaScript/TypeScript patterns
            if file_path.suffix in ['.js', '.ts']:
                patterns['try_catch_blocks'] += len(re.findall(r'try\s*{', content))
                patterns['generic_catches'] += len(re.findall(r'catch\s*\([^)]*\)\s*{\s*}', content))
                patterns['unhandled_promises'] += len(re.findall(r'\.then\([^)]+\)(?!\.catch)', content))
            
            # Python patterns
            elif file_path.suffix == '.py':
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Try):
                            patterns['try_catch_blocks'] += 1
                            for handler in node.handlers:
                                if handler.type is None:
                                    patterns['generic_catches'] += 1
                except:
                    pass
        
        return patterns
    
    def _analyze_logging(self, project_path):
        """Analyze logging patterns"""
        logging_patterns = {
            'console_logs': 0,
            'structured_logging': False,
            'log_levels_used': set(),
            'logging_frameworks': []
        }
        
        # Check for logging frameworks
        package_files = ['package.json', 'requirements.txt', 'go.mod', 'pom.xml']
        for pkg_file in package_files:
            pkg_path = Path(project_path) / pkg_file
            if pkg_path.exists():
                content = pkg_path.read_text()
                if 'winston' in content or 'bunyan' in content:
                    logging_patterns['logging_frameworks'].append('winston/bunyan')
                if 'pino' in content:
                    logging_patterns['logging_frameworks'].append('pino')
                if 'logging' in content:
                    logging_patterns['logging_frameworks'].append('python-logging')
                if 'logrus' in content or 'zap' in content:
                    logging_patterns['logging_frameworks'].append('logrus/zap')
        
        return logging_patterns
```

### 2. Error Tracking Service Integration

Implement integrations with popular error tracking services:

**Sentry Integration**
```javascript
// sentry-setup.js
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

class SentryErrorTracker {
    constructor(config) {
        this.config = config;
        this.initialized = false;
    }
    
    initialize() {
        Sentry.init({
            dsn: this.config.dsn,
            environment: this.config.environment,
            release: this.config.release,
            
            // Performance Monitoring
            tracesSampleRate: this.config.tracesSampleRate || 0.1,
            profilesSampleRate: this.config.profilesSampleRate || 0.1,
            
            // Integrations
            integrations: [
                // HTTP integration
                new Sentry.Integrations.Http({ tracing: true }),
                
                // Express integration
                new Sentry.Integrations.Express({
                    app: this.config.app,
                    router: true,
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
                }),
                
                // Database integration
                new Sentry.Integrations.Postgres(),
                new Sentry.Integrations.Mysql(),
                new Sentry.Integrations.Mongo(),
                
                // Profiling
                new ProfilingIntegration(),
                
                // Custom integrations
                ...this.getCustomIntegrations()
            ],
            
            // Filtering
            beforeSend: (event, hint) => {
                // Filter sensitive data
                if (event.request?.cookies) {
                    delete event.request.cookies;
                }
                
                // Filter out specific errors
                if (this.shouldFilterError(event, hint)) {
                    return null;
                }
                
                // Enhance error context
                return this.enhanceErrorEvent(event, hint);
            },
            
            // Breadcrumbs
            beforeBreadcrumb: (breadcrumb, hint) => {
                // Filter sensitive breadcrumbs
                if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
                    return null;
                }
                
                return breadcrumb;
            },
            
            // Options
            attachStacktrace: true,
            shutdownTimeout: 5000,
            maxBreadcrumbs: 100,
            debug: this.config.debug || false,
            
            // Tags
            initialScope: {
                tags: {
                    component: this.config.component,
                    version: this.config.version
                },
                user: {
                    id: this.config.userId,
                    segment: this.config.userSegment
                }
            }
        });
        
        this.initialized = true;
        this.setupErrorHandlers();
    }
    
    setupErrorHandlers() {
        // Global error handler
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            Sentry.captureException(error, {
                tags: { type: 'uncaught_exception' },
                level: 'fatal'
            });
            
            // Graceful shutdown
            this.gracefulShutdown();
        });
        
        // Promise rejection handler
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection:', reason);
            Sentry.captureException(reason, {
                tags: { type: 'unhandled_rejection' },
                extra: { promise: promise.toString() }
            });
        });
    }
    
    enhanceErrorEvent(event, hint) {
        // Add custom context
        event.extra = {
            ...event.extra,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            nodeVersion: process.version
        };
        
        // Add user context
        if (this.config.getUserContext) {
            event.user = this.config.getUserContext();
        }
        
        // Add custom fingerprinting
        if (hint.originalException) {
            event.fingerprint = this.generateFingerprint(hint.originalException);
        }
        
        return event;
    }
    
    generateFingerprint(error) {
        // Custom fingerprinting logic
        const fingerprint = [];
        
        // Group by error type
        fingerprint.push(error.name || 'Error');
        
        // Group by error location
        if (error.stack) {
            const match = error.stack.match(/at\s+(.+?)\s+\(/);
            if (match) {
                fingerprint.push(match[1]);
            }
        }
        
        // Group by custom properties
        if (error.code) {
            fingerprint.push(error.code);
        }
        
        return fingerprint;
    }
}

// Express middleware
export const sentryMiddleware = {
    requestHandler: Sentry.Handlers.requestHandler(),
    tracingHandler: Sentry.Handlers.tracingHandler(),
    errorHandler: Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
            // Capture 4xx and 5xx errors
            if (error.status >= 400) {
                return true;
            }
            return false;
        }
    })
};
```

**Custom Error Tracking Service**
```typescript
// error-tracker.ts
interface ErrorEvent {
    timestamp: Date;
    level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
    message: string;
    stack?: string;
    context: {
        user?: any;
        request?: any;
        environment: string;
        release: string;
        tags: Record<string, string>;
        extra: Record<string, any>;
    };
    fingerprint: string[];
}

class ErrorTracker {
    private queue: ErrorEvent[] = [];
    private batchSize = 10;
    private flushInterval = 5000;
    
    constructor(private config: ErrorTrackerConfig) {
        this.startBatchProcessor();
    }
    
    captureException(error: Error, context?: Partial<ErrorEvent['context']>) {
        const event: ErrorEvent = {
            timestamp: new Date(),
            level: 'error',
            message: error.message,
            stack: error.stack,
            context: {
                environment: this.config.environment,
                release: this.config.release,
                tags: {},
                extra: {},
                ...context
            },
            fingerprint: this.generateFingerprint(error)
        };
        
        this.addToQueue(event);
    }
    
    captureMessage(message: string, level: ErrorEvent['level'] = 'info') {
        const event: ErrorEvent = {
            timestamp: new Date(),
            level,
            message,
            context: {
                environment: this.config.environment,
                release: this.config.release,
                tags: {},
                extra: {}
            },
            fingerprint: [message]
        };
        
        this.addToQueue(event);
    }
    
    private addToQueue(event: ErrorEvent) {
        // Apply sampling
        if (Math.random() > this.config.sampleRate) {
            return;
        }
        
        // Filter sensitive data
        event = this.sanitizeEvent(event);
        
        // Add to queue
        this.queue.push(event);
        
        // Flush if queue is full
        if (this.queue.length >= this.batchSize) {
            this.flush();
        }
    }
    
    private sanitizeEvent(event: ErrorEvent): ErrorEvent {
        // Remove sensitive data
        const sensitiveKeys = ['password', 'token', 'secret', 'api_key'];
        
        const sanitize = (obj: any): any => {
            if (!obj || typeof obj !== 'object') return obj;
            
            const cleaned = Array.isArray(obj) ? [] : {};
            
            for (const [key, value] of Object.entries(obj)) {
                if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                    cleaned[key] = '[REDACTED]';
                } else if (typeof value === 'object') {
                    cleaned[key] = sanitize(value);
                } else {
                    cleaned[key] = value;
                }
            }
            
            return cleaned;
        };
        
        return {
            ...event,
            context: sanitize(event.context)
        };
    }
    
    private async flush() {
        if (this.queue.length === 0) return;
        
        const events = this.queue.splice(0, this.batchSize);
        
        try {
            await this.sendEvents(events);
        } catch (error) {
            console.error('Failed to send error events:', error);
            // Re-queue events
            this.queue.unshift(...events);
        }
    }
    
    private async sendEvents(events: ErrorEvent[]) {
        const response = await fetch(this.config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({ events })
        });
        
        if (!response.ok) {
            throw new Error(`Error tracking API returned ${response.status}`);
        }
    }
}
```

### 3. Structured Logging Implementation

Implement comprehensive structured logging:

**Advanced Logger**
```typescript
// structured-logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

class StructuredLogger {
    private logger: winston.Logger;
    
    constructor(config: LoggerConfig) {
        this.logger = winston.createLogger({
            level: config.level || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.metadata(),
                winston.format.json()
            ),
            defaultMeta: {
                service: config.service,
                environment: config.environment,
                version: config.version
            },
            transports: this.createTransports(config)
        });
    }
    
    private createTransports(config: LoggerConfig): winston.transport[] {
        const transports: winston.transport[] = [];
        
        // Console transport for development
        if (config.environment === 'development') {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }
        
        // File transport for all environments
        transports.push(new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }));
        
        transports.push(new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5
        });
        
        // Elasticsearch transport for production
        if (config.elasticsearch) {
            transports.push(new ElasticsearchTransport({
                level: 'info',
                clientOpts: config.elasticsearch,
                index: `logs-${config.service}`,
                transformer: (logData) => {
                    return {
                        '@timestamp': logData.timestamp,
                        severity: logData.level,
                        message: logData.message,
                        fields: {
                            ...logData.metadata,
                            ...logData.defaultMeta
                        }
                    };
                }
            }));
        }
        
        return transports;
    }
    
    // Logging methods with context
    error(message: string, error?: Error, context?: any) {
        this.logger.error(message, {
            error: {
                message: error?.message,
                stack: error?.stack,
                name: error?.name
            },
            ...context
        });
    }
    
    warn(message: string, context?: any) {
        this.logger.warn(message, context);
    }
    
    info(message: string, context?: any) {
        this.logger.info(message, context);
    }
    
    debug(message: string, context?: any) {
        this.logger.debug(message, context);
    }
    
    // Performance logging
    startTimer(label: string): () => void {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.info(`Timer ${label}`, { duration, label });
        };
    }
    
    // Audit logging
    audit(action: string, userId: string, details: any) {
        this.info('Audit Event', {
            type: 'audit',
            action,
            userId,
            timestamp: new Date().toISOString(),
            details
        });
    }
}

// Request logging middleware
export function requestLoggingMiddleware(logger: StructuredLogger) {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        
        // Log request
        logger.info('Incoming request', {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        
        // Log response
        res.on('finish', () => {
            const duration = Date.now() - start;
            logger.info('Request completed', {
                method: req.method,
                url: req.url,
                status: res.statusCode,
                duration,
                contentLength: res.get('content-length')
            });
        });
        
        next();
    };
}
```

### 4. Error Alerting Configuration

Set up intelligent alerting:

**Alert Manager**
```python
# alert_manager.py
from dataclasses import dataclass
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio

@dataclass
class AlertRule:
    name: str
    condition: str
    threshold: float
    window: timedelta
    severity: str
    channels: List[str]
    cooldown: timedelta = timedelta(minutes=15)

class AlertManager:
    def __init__(self, config):
        self.config = config
        self.rules = self._load_rules()
        self.alert_history = {}
        self.channels = self._setup_channels()
    
    def _load_rules(self):
        """Load alert rules from configuration"""
        return [
            AlertRule(
                name="High Error Rate",
                condition="error_rate",
                threshold=0.05,  # 5% error rate
                window=timedelta(minutes=5),
                severity="critical",
                channels=["slack", "pagerduty"]
            ),
            AlertRule(
                name="Response Time Degradation",
                condition="response_time_p95",
                threshold=1000,  # 1 second
                window=timedelta(minutes=10),
                severity="warning",
                channels=["slack"]
            ),
            AlertRule(
                name="Memory Usage Critical",
                condition="memory_usage_percent",
                threshold=90,
                window=timedelta(minutes=5),
                severity="critical",
                channels=["slack", "pagerduty"]
            ),
            AlertRule(
                name="Disk Space Low",
                condition="disk_free_percent",
                threshold=10,
                window=timedelta(minutes=15),
                severity="warning",
                channels=["slack", "email"]
            )
        ]
    
    async def evaluate_rules(self, metrics: Dict):
        """Evaluate all alert rules against current metrics"""
        for rule in self.rules:
            if await self._should_alert(rule, metrics):
                await self._send_alert(rule, metrics)
    
    async def _should_alert(self, rule: AlertRule, metrics: Dict) -> bool:
        """Check if alert should be triggered"""
        # Check if metric exists
        if rule.condition not in metrics:
            return False
        
        # Check threshold
        value = metrics[rule.condition]
        if not self._check_threshold(value, rule.threshold, rule.condition):
            return False
        
        # Check cooldown
        last_alert = self.alert_history.get(rule.name)
        if last_alert and datetime.now() - last_alert < rule.cooldown:
            return False
        
        return True
    
    async def _send_alert(self, rule: AlertRule, metrics: Dict):
        """Send alert through configured channels"""
        alert_data = {
            "rule": rule.name,
            "severity": rule.severity,
            "value": metrics[rule.condition],
            "threshold": rule.threshold,
            "timestamp": datetime.now().isoformat(),
            "environment": self.config.environment,
            "service": self.config.service
        }
        
        # Send to all channels
        tasks = []
        for channel_name in rule.channels:
            if channel_name in self.channels:
                channel = self.channels[channel_name]
                tasks.append(channel.send(alert_data))
        
        await asyncio.gather(*tasks)
        
        # Update alert history
        self.alert_history[rule.name] = datetime.now()

# Alert channels
class SlackAlertChannel:
    def __init__(self, webhook_url):
        self.webhook_url = webhook_url
    
    async def send(self, alert_data):
        """Send alert to Slack"""
        color = {
            "critical": "danger",
            "warning": "warning",
            "info": "good"
        }.get(alert_data["severity"], "danger")
        
        payload = {
            "attachments": [{
                "color": color,
                "title": f"🚨 {alert_data['rule']}",
                "fields": [
                    {
                        "title": "Severity",
                        "value": alert_data["severity"].upper(),
                        "short": True
                    },
                    {
                        "title": "Environment",
                        "value": alert_data["environment"],
                        "short": True
                    },
                    {
                        "title": "Current Value",
                        "value": str(alert_data["value"]),
                        "short": True
                    },
                    {
                        "title": "Threshold",
                        "value": str(alert_data["threshold"]),
                        "short": True
                    }
                ],
                "footer": alert_data["service"],
                "ts": int(datetime.now().timestamp())
            }]
        }
        
        # Send to Slack
        async with aiohttp.ClientSession() as session:
            await session.post(self.webhook_url, json=payload)
```

### 5. Error Grouping and Deduplication

Implement intelligent error grouping:

**Error Grouping Algorithm**
```python
import hashlib
import re
from difflib import SequenceMatcher

class ErrorGrouper:
    def __init__(self):
        self.groups = {}
        self.patterns = self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for normalization"""
        return {
            'numbers': re.compile(r'\b\d+\b'),
            'uuids': re.compile(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'),
            'urls': re.compile(r'https?://[^\s]+'),
            'file_paths': re.compile(r'(/[^/\s]+)+'),
            'memory_addresses': re.compile(r'0x[0-9a-fA-F]+'),
            'timestamps': re.compile(r'\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}')
        }
    
    def group_error(self, error):
        """Group error with similar errors"""
        fingerprint = self.generate_fingerprint(error)
        
        # Find existing group
        group = self.find_similar_group(fingerprint, error)
        
        if group:
            group['count'] += 1
            group['last_seen'] = error['timestamp']
            group['instances'].append(error)
        else:
            # Create new group
            self.groups[fingerprint] = {
                'fingerprint': fingerprint,
                'first_seen': error['timestamp'],
                'last_seen': error['timestamp'],
                'count': 1,
                'instances': [error],
                'pattern': self.extract_pattern(error)
            }
        
        return fingerprint
    
    def generate_fingerprint(self, error):
        """Generate unique fingerprint for error"""
        # Normalize error message
        normalized = self.normalize_message(error['message'])
        
        # Include error type and location
        components = [
            error.get('type', 'Unknown'),
            normalized,
            self.extract_location(error.get('stack', ''))
        ]
        
        # Generate hash
        fingerprint = hashlib.sha256(
            '|'.join(components).encode()
        ).hexdigest()[:16]
        
        return fingerprint
    
    def normalize_message(self, message):
        """Normalize error message for grouping"""
        # Replace dynamic values
        normalized = message
        for pattern_name, pattern in self.patterns.items():
            normalized = pattern.sub(f'<{pattern_name}>', normalized)
        
        return normalized.strip()
    
    def extract_location(self, stack):
        """Extract error location from stack trace"""
        if not stack:
            return 'unknown'
        
        lines = stack.split('\n')
        for line in lines:
            # Look for file references
            if ' at ' in line:
                # Extract file and line number
                match = re.search(r'at\s+(.+?)\s*\((.+?):(\d+):(\d+)\)', line)
                if match:
                    file_path = match.group(2)
                    # Normalize file path
                    file_path = re.sub(r'.*/(?=src/|lib/|app/)', '', file_path)
                    return f"{file_path}:{match.group(3)}"
        
        return 'unknown'
    
    def find_similar_group(self, fingerprint, error):
        """Find similar error group using fuzzy matching"""
        if fingerprint in self.groups:
            return self.groups[fingerprint]
        
        # Try fuzzy matching
        normalized_message = self.normalize_message(error['message'])
        
        for group_fp, group in self.groups.items():
            similarity = SequenceMatcher(
                None,
                normalized_message,
                group['pattern']
            ).ratio()
            
            if similarity > 0.85:  # 85% similarity threshold
                return group
        
        return None
```

### 6. Performance Impact Tracking

Monitor performance impact of errors:

**Performance Monitor**
```typescript
// performance-monitor.ts
interface PerformanceMetrics {
    responseTime: number;
    errorRate: number;
    throughput: number;
    apdex: number;
    resourceUsage: {
        cpu: number;
        memory: number;
        disk: number;
    };
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetrics[]> = new Map();
    private intervals: Map<string, NodeJS.Timer> = new Map();
    
    startMonitoring(service: string, interval: number = 60000) {
        const timer = setInterval(() => {
            this.collectMetrics(service);
        }, interval);
        
        this.intervals.set(service, timer);
    }
    
    private async collectMetrics(service: string) {
        const metrics: PerformanceMetrics = {
            responseTime: await this.getResponseTime(service),
            errorRate: await this.getErrorRate(service),
            throughput: await this.getThroughput(service),
            apdex: await this.calculateApdex(service),
            resourceUsage: await this.getResourceUsage()
        };
        
        // Store metrics
        if (!this.metrics.has(service)) {
            this.metrics.set(service, []);
        }
        
        const serviceMetrics = this.metrics.get(service)!;
        serviceMetrics.push(metrics);
        
        // Keep only last 24 hours
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = serviceMetrics.filter(m => m.timestamp > dayAgo);
        this.metrics.set(service, filtered);
        
        // Check for anomalies
        this.detectAnomalies(service, metrics);
    }
    
    private detectAnomalies(service: string, current: PerformanceMetrics) {
        const history = this.metrics.get(service) || [];
        if (history.length < 10) return; // Need history for comparison
        
        // Calculate baselines
        const baseline = this.calculateBaseline(history.slice(-60)); // Last hour
        
        // Check for anomalies
        const anomalies = [];
        
        if (current.responseTime > baseline.responseTime * 2) {
            anomalies.push({
                type: 'response_time_spike',
                severity: 'warning',
                value: current.responseTime,
                baseline: baseline.responseTime
            });
        }
        
        if (current.errorRate > baseline.errorRate + 0.05) {
            anomalies.push({
                type: 'error_rate_increase',
                severity: 'critical',
                value: current.errorRate,
                baseline: baseline.errorRate
            });
        }
        
        if (anomalies.length > 0) {
            this.reportAnomalies(service, anomalies);
        }
    }
    
    private calculateBaseline(history: PerformanceMetrics[]) {
        const sum = history.reduce((acc, m) => ({
            responseTime: acc.responseTime + m.responseTime,
            errorRate: acc.errorRate + m.errorRate,
            throughput: acc.throughput + m.throughput,
            apdex: acc.apdex + m.apdex
        }), {
            responseTime: 0,
            errorRate: 0,
            throughput: 0,
            apdex: 0
        });
        
        return {
            responseTime: sum.responseTime / history.length,
            errorRate: sum.errorRate / history.length,
            throughput: sum.throughput / history.length,
            apdex: sum.apdex / history.length
        };
    }
    
    async calculateApdex(service: string, threshold: number = 500) {
        // Apdex = (Satisfied + Tolerating/2) / Total
        const satisfied = await this.countRequests(service, 0, threshold);
        const tolerating = await this.countRequests(service, threshold, threshold * 4);
        const total = await this.getTotalRequests(service);
        
        if (total === 0) return 1;
        
        return (satisfied + tolerating / 2) / total;
    }
}
```

### 7. Error Recovery Strategies

Implement automatic error recovery:

**Recovery Manager**
```javascript
// recovery-manager.js
class RecoveryManager {
    constructor(config) {
        this.strategies = new Map();
        this.retryPolicies = config.retryPolicies || {};
        this.circuitBreakers = new Map();
        this.registerDefaultStrategies();
    }
    
    registerStrategy(errorType, strategy) {
        this.strategies.set(errorType, strategy);
    }
    
    registerDefaultStrategies() {
        // Network errors
        this.registerStrategy('NetworkError', async (error, context) => {
            return this.retryWithBackoff(
                context.operation,
                this.retryPolicies.network || {
                    maxRetries: 3,
                    baseDelay: 1000,
                    maxDelay: 10000
                }
            );
        });
        
        // Database errors
        this.registerStrategy('DatabaseError', async (error, context) => {
            // Try read replica if available
            if (context.operation.type === 'read' && context.readReplicas) {
                return this.tryReadReplica(context);
            }
            
            // Otherwise retry with backoff
            return this.retryWithBackoff(
                context.operation,
                this.retryPolicies.database || {
                    maxRetries: 2,
                    baseDelay: 500,
                    maxDelay: 5000
                }
            );
        });
        
        // Rate limit errors
        this.registerStrategy('RateLimitError', async (error, context) => {
            const retryAfter = error.retryAfter || 60;
            await this.delay(retryAfter * 1000);
            return context.operation();
        });
        
        // Circuit breaker for external services
        this.registerStrategy('ExternalServiceError', async (error, context) => {
            const breaker = this.getCircuitBreaker(context.service);
            
            try {
                return await breaker.execute(context.operation);
            } catch (error) {
                // Fallback to cache or default
                if (context.fallback) {
                    return context.fallback();
                }
                throw error;
            }
        });
    }
    
    async recover(error, context) {
        const errorType = this.classifyError(error);
        const strategy = this.strategies.get(errorType);
        
        if (!strategy) {
            // No recovery strategy, rethrow
            throw error;
        }
        
        try {
            const result = await strategy(error, context);
            
            // Log recovery success
            this.logRecovery(error, errorType, 'success');
            
            return result;
        } catch (recoveryError) {
            // Log recovery failure
            this.logRecovery(error, errorType, 'failure', recoveryError);
            
            // Throw original error
            throw error;
        }
    }
    
    async retryWithBackoff(operation, policy) {
        let lastError;
        let delay = policy.baseDelay;
        
        for (let attempt = 0; attempt < policy.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt < policy.maxRetries - 1) {
                    await this.delay(delay);
                    delay = Math.min(delay * 2, policy.maxDelay);
                }
            }
        }
        
        throw lastError;
    }
    
    getCircuitBreaker(service) {
        if (!this.circuitBreakers.has(service)) {
            this.circuitBreakers.set(service, new CircuitBreaker({
                timeout: 3000,
                errorThresholdPercentage: 50,
                resetTimeout: 30000,
                rollingCountTimeout: 10000,
                rollingCountBuckets: 10,
                volumeThreshold: 10
            }));
        }
        
        return this.circuitBreakers.get(service);
    }
    
    classifyError(error) {
        // Classify by error code
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return 'NetworkError';
        }
        
        if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'SQLITE_BUSY') {
            return 'DatabaseError';
        }
        
        if (error.status === 429) {
            return 'RateLimitError';
        }
        
        if (error.isExternalService) {
            return 'ExternalServiceError';
        }
        
        // Default
        return 'UnknownError';
    }
}

// Circuit breaker implementation
class CircuitBreaker {
    constructor(options) {
        this.options = options;
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = Date.now();
    }
    
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                throw new Error('Circuit breaker is OPEN');
            }
            
            // Try half-open
            this.state = 'HALF_OPEN';
        }
        
        try {
            const result = await Promise.race([
                operation(),
                this.timeout(this.options.timeout)
            ]);
            
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failures = 0;
        
        if (this.state === 'HALF_OPEN') {
            this.successes++;
            if (this.successes >= this.options.volumeThreshold) {
                this.state = 'CLOSED';
                this.successes = 0;
            }
        }
    }
    
    onFailure() {
        this.failures++;
        
        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.options.resetTimeout;
        } else if (this.failures >= this.options.volumeThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.options.resetTimeout;
        }
    }
}
```

### 8. Error Dashboard

Create comprehensive error dashboard:

**Dashboard Component**
```typescript
// error-dashboard.tsx
import React from 'react';
import { LineChart, BarChart, PieChart } from 'recharts';

const ErrorDashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<DashboardMetrics>();
    const [timeRange, setTimeRange] = useState('1h');
    
    useEffect(() => {
        const fetchMetrics = async () => {
            const data = await getErrorMetrics(timeRange);
            setMetrics(data);
        };
        
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000); // Update every 30s
        
        return () => clearInterval(interval);
    }, [timeRange]);
    
    if (!metrics) return <Loading />;
    
    return (
        <div className="error-dashboard">
            <Header>
                <h1>Error Tracking Dashboard</h1>
                <TimeRangeSelector
                    value={timeRange}
                    onChange={setTimeRange}
                    options={['1h', '6h', '24h', '7d', '30d']}
                />
            </Header>
            
            <MetricCards>
                <MetricCard
                    title="Error Rate"
                    value={`${(metrics.errorRate * 100).toFixed(2)}%`}
                    trend={metrics.errorRateTrend}
                    status={metrics.errorRate > 0.05 ? 'critical' : 'ok'}
                />
                <MetricCard
                    title="Total Errors"
                    value={metrics.totalErrors.toLocaleString()}
                    trend={metrics.errorsTrend}
                />
                <MetricCard
                    title="Affected Users"
                    value={metrics.affectedUsers.toLocaleString()}
                    trend={metrics.usersTrend}
                />
                <MetricCard
                    title="MTTR"
                    value={formatDuration(metrics.mttr)}
                    trend={metrics.mttrTrend}
                />
            </MetricCards>
            
            <ChartGrid>
                <ChartCard title="Error Trend">
                    <LineChart data={metrics.errorTrend}>
                        <Line
                            type="monotone"
                            dataKey="errors"
                            stroke="#ff6b6b"
                            strokeWidth={2}
                        />
                        <Line
                            type="monotone"
                            dataKey="warnings"
                            stroke="#ffd93d"
                            strokeWidth={2}
                        />
                    </LineChart>
                </ChartCard>
                
                <ChartCard title="Error Distribution">
                    <PieChart data={metrics.errorDistribution}>
                        <Pie
                            dataKey="count"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                        />
                    </PieChart>
                </ChartCard>
                
                <ChartCard title="Top Errors">
                    <BarChart data={metrics.topErrors}>
                        <Bar dataKey="count" fill="#ff6b6b" />
                    </BarChart>
                </ChartCard>
                
                <ChartCard title="Error Heatmap">
                    <ErrorHeatmap data={metrics.errorHeatmap} />
                </ChartCard>
            </ChartGrid>
            
            <ErrorList>
                <h2>Recent Errors</h2>
                <ErrorTable
                    errors={metrics.recentErrors}
                    onErrorClick={handleErrorClick}
                />
            </ErrorList>
            
            <AlertsSection>
                <h2>Active Alerts</h2>
                <AlertsList alerts={metrics.activeAlerts} />
            </AlertsSection>
        </div>
    );
};

// Real-time error stream
const ErrorStream: React.FC = () => {
    const [errors, setErrors] = useState<ErrorEvent[]>([]);
    
    useEffect(() => {
        const eventSource = new EventSource('/api/errors/stream');
        
        eventSource.onmessage = (event) => {
            const error = JSON.parse(event.data);
            setErrors(prev => [error, ...prev].slice(0, 100));
        };
        
        return () => eventSource.close();
    }, []);
    
    return (
        <div className="error-stream">
            <h3>Live Error Stream</h3>
            <div className="stream-container">
                {errors.map((error, index) => (
                    <ErrorStreamItem
                        key={error.id}
                        error={error}
                        isNew={index === 0}
                    />
                ))}
            </div>
        </div>
    );
};
```

## Output Format

1. **Error Tracking Analysis**: Current error handling assessment
2. **Integration Configuration**: Setup for error tracking services
3. **Logging Implementation**: Structured logging setup
4. **Alert Rules**: Intelligent alerting configuration
5. **Error Grouping**: Deduplication and grouping logic
6. **Recovery Strategies**: Automatic error recovery implementation
7. **Dashboard Setup**: Real-time error monitoring dashboard
8. **Documentation**: Implementation and troubleshooting guide

Focus on providing comprehensive error visibility, intelligent alerting, and quick error resolution capabilities.
