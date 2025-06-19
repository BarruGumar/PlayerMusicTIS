import pygame
import sys
import os


# Inicializar o mixer
pygame.mixer.init()


def tocar_musica(ficheiro):
    if not os.path.isfile(ficheiro):
        print("Ficheiro não encontrado:", ficheiro)
        return

    print("A tocar:", ficheiro)
    pygame.mixer.music.load(ficheiro)
    pygame.mixer.music.play()
    
    # Manter o programa a correr até a música acabar
    while pygame.mixer.music.get_busy():
        pygame.time.Clock().tick(10)
        
        

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python tocar.py <caminho/para/ficheiro.mp3>")
    else:
        tocar_musica(sys.argv[1])