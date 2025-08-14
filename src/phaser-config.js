// Phaser Configuration for Two Truths and a Lie Game
export const phaserConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'phaser-container',
    transparent: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Assets configuration
export const gameAssets = {
    images: {
        star: 'assets/images/star.svg',
        confetti: 'assets/images/confetti.svg',
        squirrel: 'assets/images/TestIO_squirel.png'
    },
    audio: {
        backgroundMusic: 'assets/audio/elevator_music.mp3'
    }
};

// Animation configuration
export const animationSettings = {
    fireworks: {
        colors: [0xFFD700, 0xFF6B6B, 0x51CF66, 0x667EEA, 0xFF8C42],
        textures: ['star', 'confetti'],
        particleCount: 8,
        particleSpeed: { min: 100, max: 300 },
        particleLifespan: 1500,
        gravityY: 50
    },
    thumbsDown: {
        particleCount: 10,
        particleSpeed: { min: 100, max: 200 },
        particleLifespan: 3000,
        tint: 0xFF6B6B
    }
};
