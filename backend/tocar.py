import pygame
import sys
import os
import threading
import time
import json
from flask import Flask, request, jsonify

class SimpleMusicPlayer:
    def __init__(self):
        pygame.mixer.init()
        self.current_file = None
        self.is_playing = False
        self.is_paused = False
        self.volume = 0.7
        
    def tocar_musica(self, ficheiro):
        """Versão melhorada da sua função original"""
        if not os.path.isfile(ficheiro):
            print("Ficheiro não encontrado:", ficheiro)
            return False

        try:
            print("A tocar:", ficheiro)
            pygame.mixer.music.load(ficheiro)
            pygame.mixer.music.set_volume(self.volume)
            pygame.mixer.music.play()
            
            self.current_file = ficheiro
            self.is_playing = True
            self.is_paused = False
            
            return True
        except Exception as e:
            print(f"Erro ao tocar música: {e}")
            return False
    
    def pausar(self):
        """Nova funcionalidade: pausar"""
        if self.is_playing and not self.is_paused:
            pygame.mixer.music.pause()
            self.is_paused = True
            print("Música pausada")
            return True
        return False
    
    def retomar(self):
        """Nova funcionalidade: retomar"""
        if self.is_playing and self.is_paused:
            pygame.mixer.music.unpause()
            self.is_paused = False
            print("Música retomada")
            return True
        return False
    
    def parar(self):
        """Nova funcionalidade: parar"""
        pygame.mixer.music.stop()
        self.is_playing = False
        self.is_paused = False
        self.current_file = None
        print("Música parada")
        return True
    
    def definir_volume(self, volume):
        """Nova funcionalidade: controlar volume"""
        self.volume = max(0.0, min(1.0, float(volume)))
        pygame.mixer.music.set_volume(self.volume)
        print(f"Volume definido para {int(self.volume * 100)}%")
        return self.volume
    
    def get_status(self):
        """Nova funcionalidade: obter status"""
        return {
            'tocando': self.is_playing,
            'pausado': self.is_paused,
            'ficheiro_atual': os.path.basename(self.current_file) if self.current_file else None,
            'volume': int(self.volume * 100),
            'mixer_ocupado': pygame.mixer.music.get_busy()
        }
    
    def monitorar_reproducao(self):
        """Thread para monitorar quando a música acaba"""
        while True:
            if self.is_playing and not pygame.mixer.music.get_busy() and not self.is_paused:
                print("Música terminou")
                self.is_playing = False
                self.current_file = None
            time.sleep(1)

# Instância global do player
player = SimpleMusicPlayer()

# Versão original melhorada para linha de comando
def modo_linha_comando():
    if len(sys.argv) < 2:
        print("Uso: python tocar_melhorado.py <../music/ficheiro.mp3>")
        return
    
    ficheiro = sys.argv[1]
    
    if player.tocar_musica(ficheiro):
        print("Pressione 'q' para sair, 'p' para pausar/retomar, 's' para parar")
        print("Use '+' e '-' para controlar volume")
        
        # Loop não-bloqueante com controles
        while player.is_playing:
            # Verifica se ainda está tocando
            if not pygame.mixer.music.get_busy() and not player.is_paused:
                print("Música terminou")
                break
            
            # Simula entrada de teclado (em ambiente real, use threading ou input não-bloqueante)
            pygame.time.Clock().tick(10)

# API Flask para controle remoto
app = Flask(__name__)

@app.route('/api/tocar', methods=['POST'])
def api_tocar():
    data = request.get_json()
    ficheiro = data.get('ficheiro')
    
    if not ficheiro:
        return jsonify({'sucesso': False, 'erro': 'Ficheiro não especificado'})
    
    sucesso = player.tocar_musica(ficheiro)
    return jsonify({
        'sucesso': sucesso,
        'mensagem': f'A tocar: {os.path.basename(ficheiro)}' if sucesso else 'Erro ao tocar'
    })

@app.route('/api/pausar', methods=['POST'])
def api_pausar():
    sucesso = player.pausar()
    return jsonify({'sucesso': sucesso})

@app.route('/api/retomar', methods=['POST'])
def api_retomar():
    sucesso = player.retomar()
    return jsonify({'sucesso': sucesso})

@app.route('/api/parar', methods=['POST'])
def api_parar():
    sucesso = player.parar()
    return jsonify({'sucesso': sucesso})

@app.route('/api/volume', methods=['POST'])
def api_volume():
    data = request.get_json()
    volume = data.get('volume', 0.7)
    novo_volume = player.definir_volume(volume)
    return jsonify({'sucesso': True, 'volume': int(novo_volume * 100)})

@app.route('/api/status', methods=['GET'])
def api_status():
    return jsonify(player.get_status())

if __name__ == "__main__":
    # Inicia monitor em thread separada
    monitor_thread = threading.Thread(target=player.monitorar_reproducao, daemon=True)
    monitor_thread.start()
    
    # Verifica se deve rodar em modo API ou linha de comando
    if len(sys.argv) > 1 and sys.argv[1] == '--api':
        print("=== Modo API ===")
        print("Servidor rodando em http://   192.168.1.101:5000")
        app.run(host='172.16.221.201', port=5000, debug=True)
    else:
        print("=== Modo Linha de Comando ===")
        modo_linha_comando()