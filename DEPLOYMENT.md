# Deployment Guide

## Production Deployment Checklist

### Security
- [ ] Change `JWT_SECRET` to a cryptographically secure random string
- [ ] Enable HTTPS/WSS (not HTTP/WS)
- [ ] Set up CORS whitelist in backend
- [ ] Enable rate limiting on API endpoints
- [ ] Use MongoDB authentication
- [ ] Use Redis password authentication
- [ ] Set `NODE_ENV=production`
- [ ] Remove development logging
- [ ] Add API key authentication
- [ ] Implement document permissions

### Performance
- [ ] Enable MongoDB indexes
- [ ] Configure Redis persistence (AOF/RDB)
- [ ] Set up CDN for frontend assets
- [ ] Enable gzip compression
- [ ] Implement connection pooling
- [ ] Add caching headers
- [ ] Monitor memory usage
- [ ] Set up health checks
- [ ] Configure load balancer

### Monitoring
- [ ] Set up application logging (Winston/Pino)
- [ ] Add error tracking (Sentry)
- [ ] Monitor WebSocket connections
- [ ] Track operation latency
- [ ] Monitor MongoDB/Redis health
- [ ] Set up alerts for downtime
- [ ] Track memory/CPU usage
- [ ] Log security events

## Deployment Options

### Option 1: Docker on VPS (DigitalOcean, Linode, etc.)

**Prerequisites:**
- Ubuntu 22.04+ server
- 2GB+ RAM
- Docker & Docker Compose installed

**Steps:**

1. **Prepare server**
   ```bash
   ssh user@your-server
   sudo apt update && sudo apt upgrade -y
   sudo apt install docker.io docker-compose git -y
   sudo usermod -aG docker $USER
   ```

2. **Clone repository**
   ```bash
   git clone <your-repo>
   cd collab-editor
   ```

3. **Configure environment**
   ```bash
   # Generate secure secret
   openssl rand -base64 32
   
   # Edit backend/.env
   nano backend/.env
   # Set:
   # JWT_SECRET=<generated-secret>
   # NODE_ENV=production
   # MONGODB_URI=mongodb://mongo:27017/collab-editor
   ```

4. **Deploy**
   ```bash
   docker-compose up -d --build
   docker-compose ps  # Verify all healthy
   ```

5. **Set up Nginx reverse proxy**
   ```bash
   sudo apt install nginx -y
   sudo nano /etc/nginx/sites-available/collab-editor
   ```

   ```nginx
   # WebSocket support
   map $http_upgrade $connection_upgrade {
       default upgrade;
       '' close;
   }

   server {
       listen 80;
       server_name your-domain.com;

       # API and WebSocket
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection $connection_upgrade;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
           # WebSocket timeouts
           proxy_connect_timeout 7d;
           proxy_send_timeout 7d;
           proxy_read_timeout 7d;
       }
   }
   ```

   ```bash
   sudo ln -s /etc/nginx/sites-available/collab-editor /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d your-domain.com
   ```

7. **Deploy frontend**
   
   Option A: Static hosting (Vercel, Netlify)
   ```bash
   cd frontend
   npm install
   npm run build
   # Deploy to Vercel/Netlify with build output
   ```

   Option B: Self-hosted
   ```bash
   # Add to docker-compose.yml
   frontend:
     build:
       context: ./frontend
       dockerfile: Dockerfile
     ports:
       - "3000:3000"
     environment:
       NEXT_PUBLIC_API_URL: https://your-domain.com/api
       NEXT_PUBLIC_WS_URL: wss://your-domain.com/ws
   ```

### Option 2: AWS Deployment

**Architecture:**
```
CloudFront → S3 (Frontend)
    ↓
ALB → ECS Fargate (Backend)
    ↓
    ├─→ ElastiCache (Redis)
    └─→ DocumentDB (MongoDB)
```

**Steps:**

1. **Set up VPC and Security Groups**
   ```bash
   # Create VPC with public/private subnets
   # Security groups for:
   # - ALB (80, 443 from 0.0.0.0/0)
   # - ECS (3001 from ALB)
   # - Redis (6379 from ECS)
   # - MongoDB (27017 from ECS)
   ```

2. **Set up databases**
   ```bash
   # ElastiCache Redis cluster
   aws elasticache create-cache-cluster \
     --cache-cluster-id collab-redis \
     --engine redis \
     --cache-node-type cache.t3.micro \
     --num-cache-nodes 1

   # DocumentDB cluster
   aws docdb create-db-cluster \
     --db-cluster-identifier collab-mongo \
     --engine docdb \
     --master-username admin \
     --master-user-password <secure-password>
   ```

3. **Build and push Docker image**
   ```bash
   # Build
   docker build -t collab-editor:latest .

   # Tag and push to ECR
   aws ecr create-repository --repository-name collab-editor
   docker tag collab-editor:latest <account>.dkr.ecr.us-east-1.amazonaws.com/collab-editor:latest
   docker push <account>.dkr.ecr.us-east-1.amazonaws.com/collab-editor:latest
   ```

4. **Create ECS task definition**
   ```json
   {
     "family": "collab-editor",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "containerDefinitions": [{
       "name": "app",
       "image": "<account>.dkr.ecr.us-east-1.amazonaws.com/collab-editor:latest",
       "portMappings": [{"containerPort": 3001}],
       "environment": [
         {"name": "MONGODB_URI", "value": "<docdb-endpoint>"},
         {"name": "REDIS_HOST", "value": "<elasticache-endpoint>"},
         {"name": "JWT_SECRET", "value": "<from-secrets-manager>"}
       ]
     }]
   }
   ```

5. **Create ECS service with ALB**
   ```bash
   aws ecs create-service \
     --cluster collab-cluster \
     --service-name collab-service \
     --task-definition collab-editor \
     --desired-count 2 \
     --launch-type FARGATE \
     --load-balancers targetGroupArn=<tg-arn>,containerName=app,containerPort=3001
   ```

6. **Deploy frontend to S3 + CloudFront**
   ```bash
   cd frontend
   npm run build
   aws s3 sync out/ s3://collab-editor-frontend/
   # Create CloudFront distribution pointing to S3
   ```

### Option 3: Kubernetes (GKE/EKS)

**Prerequisites:**
- Kubernetes cluster
- kubectl configured
- Helm (optional)

**Steps:**

1. **Create namespace**
   ```bash
   kubectl create namespace collab-editor
   ```

2. **Deploy MongoDB (Helm)**
   ```bash
   helm repo add bitnami https://charts.bitnami.com/bitnami
   helm install mongodb bitnami/mongodb \
     --namespace collab-editor \
     --set auth.enabled=true \
     --set auth.rootPassword=<password>
   ```

3. **Deploy Redis (Helm)**
   ```bash
   helm install redis bitnami/redis \
     --namespace collab-editor \
     --set auth.password=<password>
   ```

4. **Deploy backend**
   ```yaml
   # backend-deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: collab-backend
     namespace: collab-editor
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: collab-backend
     template:
       metadata:
         labels:
           app: collab-backend
       spec:
         containers:
         - name: backend
           image: your-registry/collab-editor:latest
           ports:
           - containerPort: 3001
           env:
           - name: MONGODB_URI
             value: "mongodb://mongodb:27017/collab-editor"
           - name: REDIS_HOST
             value: "redis-master"
           - name: JWT_SECRET
             valueFrom:
               secretKeyRef:
                 name: jwt-secret
                 key: secret
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: collab-backend
     namespace: collab-editor
   spec:
     type: LoadBalancer
     ports:
     - port: 80
       targetPort: 3001
     selector:
       app: collab-backend
   ```

   ```bash
   kubectl apply -f backend-deployment.yaml
   ```

## Scaling Strategies

### Horizontal Scaling (1-10K users)

1. **Enable Redis Pub/Sub for cross-instance messaging**
   ```typescript
   // In connectionManager.ts
   const redisPub = new Redis(REDIS_HOST, REDIS_PORT);
   const redisSub = new Redis(REDIS_HOST, REDIS_PORT);
   
   // Subscribe to document channels
   redisSub.subscribe(`doc:${docId}`, (err, count) => {
     // Handle messages from other instances
   });
   
   // Publish operations to other instances
   redisPub.publish(`doc:${docId}`, JSON.stringify(message));
   ```

2. **Use sticky sessions** for WebSocket connections
   - Nginx: `ip_hash` directive
   - ALB: Enable sticky sessions on target group

3. **Add health checks** for auto-scaling
   ```typescript
   app.get('/health', (req, res) => {
     const health = {
       uptime: process.uptime(),
       memory: process.memoryUsage(),
       connections: wss.clients.size
     };
     res.json(health);
   });
   ```

### Database Scaling

1. **MongoDB sharding** (10K+ documents)
   ```javascript
   // Shard by docId
   sh.shardCollection("collab-editor.documents", { "_id": "hashed" })
   ```

2. **Redis clustering** (high throughput)
   ```bash
   # Use Redis Cluster instead of single instance
   # 3 masters + 3 replicas
   ```

3. **Read replicas** for heavy read workloads

### Performance Optimization

1. **Operation batching**
   ```typescript
   // Batch multiple small operations
   const batch = [];
   const BATCH_INTERVAL = 50; // ms
   
   setInterval(() => {
     if (batch.length > 0) {
       applyBatch(batch);
       batch.length = 0;
     }
   }, BATCH_INTERVAL);
   ```

2. **Content compression**
   ```typescript
   // Enable gzip for WebSocket messages
   import { deflate, inflate } from 'zlib';
   ```

3. **Connection pooling**
   ```typescript
   mongoose.connect(MONGODB_URI, {
     maxPoolSize: 10,
     minPoolSize: 5
   });
   ```

## Monitoring

### Application Monitoring

1. **Winston logging**
   ```typescript
   import winston from 'winston';
   
   const logger = winston.createLogger({
     level: 'info',
     format: winston.format.json(),
     transports: [
       new winston.transports.File({ filename: 'error.log', level: 'error' }),
       new winston.transports.File({ filename: 'combined.log' })
     ]
   });
   ```

2. **Prometheus metrics**
   ```typescript
   import { register, Counter, Histogram } from 'prom-client';
   
   const opCounter = new Counter({
     name: 'operations_total',
     help: 'Total operations processed'
   });
   
   const opLatency = new Histogram({
     name: 'operation_latency_seconds',
     help: 'Operation processing latency'
   });
   ```

### Infrastructure Monitoring

- **CloudWatch/DataDog**: CPU, memory, network
- **MongoDB Atlas**: Query performance, indexes
- **Redis monitoring**: Memory usage, evictions
- **ALB metrics**: Request count, latency, errors

## Backup Strategy

1. **MongoDB backups**
   ```bash
   # Automated daily backups
   mongodump --uri="mongodb://mongo:27017/collab-editor" --out=/backup/$(date +%Y%m%d)
   ```

2. **Redis persistence**
   ```bash
   # Enable AOF (Append Only File)
   appendonly yes
   appendfsync everysec
   ```

## Disaster Recovery

1. **Database replication**: Multi-region replicas
2. **Backup retention**: 30-day rolling backups
3. **Failover**: Automated failover for databases
4. **State recovery**: Redis snapshots for presence data

## Cost Optimization

### Development
- Use smallest instance sizes
- Single-region deployment
- No redundancy

### Production (Small)
- **Backend**: t3.small or t3.medium ($15-30/month)
- **MongoDB**: t3.small ($30/month)
- **Redis**: t3.micro ($15/month)
- **Total**: ~$60-75/month for 100-1000 users

### Production (Medium)
- **Backend**: Multiple t3.medium behind ALB ($100/month)
- **MongoDB**: Replica set ($100/month)
- **Redis**: Cluster ($50/month)
- **Total**: ~$250/month for 10K users

### Production (Large)
- **Backend**: ECS Fargate auto-scaling ($500/month)
- **MongoDB**: DocumentDB cluster ($300/month)
- **Redis**: ElastiCache cluster ($200/month)
- **Total**: ~$1000/month for 100K+ users
