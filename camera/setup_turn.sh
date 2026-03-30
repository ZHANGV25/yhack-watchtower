#!/bin/bash
# Quick coturn TURN server setup on Ubuntu (e.g., a small EC2 instance).
#
# Usage:
#   ssh -i ~/.ssh/watchtower-key.pem ubuntu@<ec2-ip> 'bash -s' < setup_turn.sh
#
# After running, set these env vars on the camera device:
#   export TURN_URL="turn:your-turn-host:3478"
#   export TURN_USER="your-turn-user"
#   export TURN_PASS="your-turn-password"

set -euo pipefail

echo "==> Installing coturn..."
sudo apt-get update -qq
sudo apt-get install -y coturn

echo "==> Writing /etc/turnserver.conf..."
sudo tee /etc/turnserver.conf > /dev/null << 'CONF'
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
user=watchtower:watchtower-turn-secret-2026
realm=watchtower.local
total-quota=100
stale-nonce=600
no-tcp-relay
# Block relay to private subnets (security best practice)
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
CONF

# Enable coturn daemon (Ubuntu disables it by default)
sudo sed -i 's/^#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn 2>/dev/null || true

echo "==> Starting coturn..."
sudo systemctl enable coturn
sudo systemctl restart coturn

PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "<public-ip>")

echo ""
echo "====================================="
echo "TURN server running on port 3478"
echo "====================================="
echo ""
echo "Set these env vars on the camera:"
echo "  export TURN_URL=\"turn:${PUBLIC_IP}:3478\""
echo "  export TURN_USER=\"watchtower\""
echo "  export TURN_PASS=\"watchtower-turn-secret-2026\""
echo ""
echo "Make sure the EC2 security group allows inbound UDP/TCP on ports 3478 and 49152-65535."
