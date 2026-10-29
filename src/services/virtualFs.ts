import { FSNode } from '../types/terminal';

const initialFS: Record<string, FSNode> = {
  bin: {
    name: 'bin',
    type: 'dir',
    updatedAt: '2026-10-20 12:00:00',
    permissions: 'drwxr-xr-x',
    children: {
      bash: { name: 'bash', type: 'file', size: 1245000, updatedAt: '2026-10-20 12:00:00', permissions: '-rwxr-xr-x' },
      ls: { name: 'ls', type: 'file', size: 142000, updatedAt: '2026-10-20 12:00:00', permissions: '-rwxr-xr-x' },
      ps: { name: 'ps', type: 'file', size: 128000, updatedAt: '2026-10-20 12:00:00', permissions: '-rwxr-xr-x' },
      ss: { name: 'ss', type: 'file', size: 185000, updatedAt: '2026-10-20 12:00:00', permissions: '-rwxr-xr-x' },
      systemctl: { name: 'systemctl', type: 'file', size: 950000, updatedAt: '2026-10-20 12:00:00', permissions: '-rwxr-xr-x' },
    },
  },
  etc: {
    name: 'etc',
    type: 'dir',
    updatedAt: '2026-10-22 09:30:00',
    permissions: 'drwxr-xr-x',
    children: {
      hosts: {
        name: 'hosts',
        type: 'file',
        size: 248,
        updatedAt: '2026-10-22 09:30:00',
        permissions: '-rw-r--r--',
        content: `127.0.0.1\tlocalhost\n127.0.1.1\tsrv-us-east-01\n10.0.4.15\tdb-primary.internal\n10.0.4.18\tredis-cache.internal\n`,
      },
      'os-release': {
        name: 'os-release',
        type: 'file',
        size: 382,
        updatedAt: '2026-10-22 09:30:00',
        permissions: '-rw-r--r--',
        content: `PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"\nNAME="Debian GNU/Linux"\nVERSION_ID="12"\nVERSION="12 (bookworm)"\nVERSION_CODENAME=bookworm\nID=debian\nHOME_URL="https://www.debian.org/"\n`,
      },
      'resolv.conf': {
        name: 'resolv.conf',
        type: 'file',
        size: 84,
        updatedAt: '2026-10-22 09:30:00',
        permissions: '-rw-r--r--',
        content: `nameserver 1.1.1.1\nnameserver 8.8.8.8\nsearch internal.cloud\n`,
      },
      nginx: {
        name: 'nginx',
        type: 'dir',
        updatedAt: '2026-10-25 14:10:00',
        permissions: 'drwxr-xr-x',
        children: {
          'nginx.conf': {
            name: 'nginx.conf',
            type: 'file',
            size: 1420,
            updatedAt: '2026-10-25 14:10:00',
            permissions: '-rw-r--r--',
            content: `user www-data;\nworker_processes auto;\npid /run/nginx.pid;\n\nevents {\n    worker_connections 2048;\n    multi_accept on;\n}\n\nhttp {\n    sendfile on;\n    tcp_nopush on;\n    keepalive_timeout 65;\n    types_hash_max_size 2048;\n\n    server {\n        listen 80 default_server;\n        listen 443 ssl default_server;\n        server_name api.infrastructure.internal;\n        location / {\n            proxy_pass http://127.0.0.1:8080;\n            proxy_set_header Host $host;\n        }\n    }\n}\n`,
          },
        },
      },
    },
  },
  var: {
    name: 'var',
    type: 'dir',
    updatedAt: '2026-10-28 10:00:00',
    permissions: 'drwxr-xr-x',
    children: {
      log: {
        name: 'log',
        type: 'dir',
        updatedAt: '2026-10-28 19:30:00',
        permissions: 'drwxr-xr-x',
        children: {
          syslog: {
            name: 'syslog',
            type: 'file',
            size: 14582000,
            updatedAt: '2026-10-28 19:35:00',
            permissions: '-rw-r-----',
            content: `Oct 28 19:22:04 srv-us-east-01 kernel: [38291.24] eth0: Link is Up - 10Gbps/Full\nOct 28 19:25:12 srv-us-east-01 systemd[1]: Started Nginx High Performance HTTP Server.\nOct 28 19:30:45 srv-us-east-01 dockerd[1280]: time="2026-10-28T19:30:45Z" level=info msg="API listen on /var/run/docker.sock"\nOct 28 19:35:10 srv-us-east-01 sshd[3840]: Accepted publickey for admin from 192.168.1.45 port 54820 ssh2\n`,
          },
          'auth.log': {
            name: 'auth.log',
            type: 'file',
            size: 421000,
            updatedAt: '2026-10-28 19:35:00',
            permissions: '-rw-r-----',
            content: `Oct 28 19:35:10 srv-us-east-01 sshd[3840]: Accepted publickey for admin from 192.168.1.45 port 54820 ssh2: RSA SHA256:7mP4...\nOct 28 19:35:10 srv-us-east-01 systemd-logind[780]: New session 42 of user admin.\n`,
          },
          nginx: {
            name: 'nginx',
            type: 'dir',
            updatedAt: '2026-10-28 19:35:00',
            permissions: 'drwxr-xr-x',
            children: {
              'access.log': {
                name: 'access.log',
                type: 'file',
                size: 89240000,
                updatedAt: '2026-10-28 19:38:00',
                permissions: '-rw-r--r--',
                content: `192.168.1.50 - - [28/Oct/2026:19:37:12 +0000] "GET /api/v1/metrics HTTP/1.1" 200 4820 "-" "Prometheus/2.45.0"\n192.168.1.50 - - [28/Oct/2026:19:37:42 +0000] "GET /api/v1/metrics HTTP/1.1" 200 4820 "-" "Prometheus/2.45.0"\n10.0.12.8 - - [28/Oct/2026:19:38:01 +0000] "POST /api/deploy HTTP/1.1" 202 85 "-" "Go-http-client/1.1"\n`,
              },
              'error.log': {
                name: 'error.log',
                type: 'file',
                size: 48200,
                updatedAt: '2026-10-28 18:45:00',
                permissions: '-rw-r--r--',
                content: `2026/10/28 18:45:01 [warn] 1420#1420: *12 a client request body is buffered to a temporary file\n2026/10/28 18:50:33 [notice] 1420#1420: signal 1 (SIGHUP) received, reconfiguring\n`,
              },
            },
          },
        },
      },
    },
  },
  home: {
    name: 'home',
    type: 'dir',
    updatedAt: '2026-10-25 10:00:00',
    permissions: 'drwxr-xr-x',
    children: {
      admin: {
        name: 'admin',
        type: 'dir',
        updatedAt: '2026-10-28 19:35:00',
        permissions: 'drwxr-xr-x',
        children: {
          '.bashrc': {
            name: '.bashrc',
            type: 'file',
            size: 3410,
            updatedAt: '2026-10-25 11:00:00',
            permissions: '-rw-r--r--',
            content: `export PS1="\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ "\nalias ll='ls -la'\nalias gs='git status'\nalias dps='docker ps --format \"table {{.Names}}\\t{{.Status}}\\t{{.Ports}}\"'\n`,
          },
          scripts: {
            name: 'scripts',
            type: 'dir',
            updatedAt: '2026-10-27 15:30:00',
            permissions: 'drwxr-xr-x',
            children: {
              'backup.sh': {
                name: 'backup.sh',
                type: 'file',
                size: 680,
                updatedAt: '2026-10-27 15:30:00',
                permissions: '-rwxr-xr-x',
                content: `#!/usr/bin/env bash\nset -euo pipefail\n\nBACKUP_DIR="/var/backups/daily"\nmkdir -p "$BACKUP_DIR"\ntar -czf "$BACKUP_DIR/etc_$(date +%F).tar.gz" /etc/nginx\necho "Backup completed successfully."\n`,
              },
            },
          },
          'notes.txt': {
            name: 'notes.txt',
            type: 'file',
            size: 195,
            updatedAt: '2026-10-28 14:00:00',
            permissions: '-rw-r--r--',
            content: `Server Maintenance Notes:\n- Upgraded kernel to 6.1.0-21-amd64\n- Local Gemma 2B model active for AI shell assistance (? prefix)\n- Next scheduled maintenance: Sunday 03:00 UTC\n`,
          },
        },
      },
    },
  },
  tmp: {
    name: 'tmp',
    type: 'dir',
    updatedAt: '2026-10-28 19:00:00',
    permissions: 'drwxrwxrwt',
    children: {
      'sess_849201.tmp': {
        name: 'sess_849201.tmp',
        type: 'file',
        size: 4096,
        updatedAt: '2026-10-20 08:00:00',
        permissions: '-rw-rw-r--',
        content: `session_data: expired\n`,
      },
      'cache_old.tmp': {
        name: 'cache_old.tmp',
        type: 'file',
        size: 184000,
        updatedAt: '2026-10-18 12:00:00',
        permissions: '-rw-rw-r--',
        content: `cache_dump: stale\n`,
      },
    },
  },
  proc: {
    name: 'proc',
    type: 'dir',
    updatedAt: '2026-10-28 19:38:00',
    permissions: 'dr-xr-xr-x',
    children: {
      cpuinfo: {
        name: 'cpuinfo',
        type: 'file',
        size: 0,
        updatedAt: '2026-10-28 19:38:00',
        permissions: '-r--r--r--',
        content: `processor\t: 0\nmodel name\t: AMD EPYC 9B14 32-Core Processor\ncpu MHz\t\t: 2800.000\ncache size\t: 1024 KB\ncpu cores\t: 8\n`,
      },
      meminfo: {
        name: 'meminfo',
        type: 'file',
        size: 0,
        updatedAt: '2026-10-28 19:38:00',
        permissions: '-r--r--r--',
        content: `MemTotal:       16384000 kB\nMemFree:         4820120 kB\nMemAvailable:   11894200 kB\nBuffers:          489200 kB\nCached:          6584880 kB\nSwapTotal:       4194300 kB\nSwapFree:        4194300 kB\n`,
      },
      uptime: {
        name: 'uptime',
        type: 'file',
        size: 0,
        updatedAt: '2026-10-28 19:38:00',
        permissions: '-r--r--r--',
        content: `849201.42 6793611.36\n`,
      },
    },
  },
};

export class VirtualFileSystem {
  private root: FSNode;

  constructor() {
    this.root = {
      name: '/',
      type: 'dir',
      updatedAt: '2026-10-28 00:00:00',
      permissions: 'drwxr-xr-x',
      children: JSON.parse(JSON.stringify(initialFS)),
    };
  }

  // Normalizes paths taking relative and absolute paths into account
  public resolvePath(target: string, cwd: string = '/home/admin'): string {
    let raw = target.trim();
    if (raw === '~' || raw.startsWith('~/')) {
      raw = raw.replace(/^~/, '/home/admin');
    }
    const isAbsolute = raw.startsWith('/');
    const parts = isAbsolute ? raw.split('/') : `${cwd}/${raw}`.split('/');

    const resolved: string[] = [];
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }

    return '/' + resolved.join('/');
  }

  public getNode(pathStr: string, cwd: string = '/home/admin'): FSNode | null {
    const resolved = this.resolvePath(pathStr, cwd);
    if (resolved === '/') return this.root;

    const parts = resolved.split('/').filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (!current.children || !current.children[part]) {
        return null;
      }
      current = current.children[part];
    }
    return current;
  }

  public listDirectory(pathStr: string, cwd: string = '/home/admin'): FSNode[] | null {
    const node = this.getNode(pathStr, cwd);
    if (!node || node.type !== 'dir' || !node.children) return null;
    return Object.values(node.children);
  }

  public readFile(pathStr: string, cwd: string = '/home/admin'): string | null {
    const node = this.getNode(pathStr, cwd);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
  }

  public writeFile(pathStr: string, content: string, cwd: string = '/home/admin'): boolean {
    const resolved = this.resolvePath(pathStr, cwd);
    const parts = resolved.split('/').filter(Boolean);
    const fileName = parts.pop();
    if (!fileName) return false;

    const parentPath = '/' + parts.join('/');
    const parentNode = this.getNode(parentPath, '/');
    if (!parentNode || parentNode.type !== 'dir' || !parentNode.children) return false;

    parentNode.children[fileName] = {
      name: fileName,
      type: 'file',
      size: new TextEncoder().encode(content).length,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      permissions: '-rw-r--r--',
      content,
    };
    return true;
  }

  public makeDir(pathStr: string, cwd: string = '/home/admin'): boolean {
    const resolved = this.resolvePath(pathStr, cwd);
    const parts = resolved.split('/').filter(Boolean);
    const dirName = parts.pop();
    if (!dirName) return false;

    const parentPath = '/' + parts.join('/');
    const parentNode = this.getNode(parentPath, '/');
    if (!parentNode || parentNode.type !== 'dir' || !parentNode.children) return false;

    if (parentNode.children[dirName]) return false; // Already exists

    parentNode.children[dirName] = {
      name: dirName,
      type: 'dir',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      permissions: 'drwxr-xr-x',
      children: {},
    };
    return true;
  }

  public remove(pathStr: string, cwd: string = '/home/admin'): boolean {
    const resolved = this.resolvePath(pathStr, cwd);
    if (resolved === '/') return false; // Guard root

    const parts = resolved.split('/').filter(Boolean);
    const targetName = parts.pop();
    if (!targetName) return false;

    const parentPath = '/' + parts.join('/');
    const parentNode = this.getNode(parentPath, '/');
    if (!parentNode || parentNode.type !== 'dir' || !parentNode.children) return false;

    if (!parentNode.children[targetName]) return false;

    delete parentNode.children[targetName];
    return true;
  }
}

export const virtualFS = new VirtualFileSystem();
