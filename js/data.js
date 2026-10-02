'use strict';

const FIGHTERS = [
  {
    id: 'jiwoo', name: '지우', type: '인간', hp: 120, attack: 25, defense: 15, speed: 30,
    description: '피카츄 대신 직접 나가는 소년',
    moves: [
      { name: '몸통박치기', power: 35, accuracy: 95, description: '몸으로 부딪쳐 공격한다.' },
      { name: '울음공격', power: 15, accuracy: 100, effect: 'attackDown', description: '적의 공격을 1단계 낮춘다.' },
      { name: '학원땡땡이', power: 0, accuracy: 100, effect: 'evasionUp', description: '자신의 회피율을 1단계 높인다.' },
      { name: '엄마찬스', power: 0, accuracy: 100, effect: 'heal', amount: 40, description: '자신의 HP를 40 회복한다.' }
    ]
  },
  {
    id: 'nuke', name: '핵탄두', type: '핵', hp: 100, attack: 40, defense: 10, speed: 15,
    description: '정은이가 발사한 그것',
    moves: [
      { name: '미사일발사', power: 45, accuracy: 90, description: '미사일을 발사한다.' },
      { name: '방사능낙진', power: 20, accuracy: 100, effect: 'radiation', description: '적에게 3턴간 턴당 8 지속 데미지를 준다.' },
      { name: '자폭', power: 90, accuracy: 100, effect: 'recoilHalf', description: '준 데미지의 50%를 반동으로 받는다.' },
      { name: '연막작전', power: 0, accuracy: 100, effect: 'evasionUp', description: '자신의 회피율을 1단계 높인다.' }
    ]
  },
  {
    id: 'chicken', name: '양념치킨', type: '음식', hp: 140, attack: 20, defense: 25, speed: 10,
    description: '바삭함이 무기다',
    moves: [
      { name: '양념범벅', power: 25, accuracy: 100, description: '끈적한 양념으로 공격한다.' },
      { name: '후라이드러시', power: 40, accuracy: 90, effect: 'recoil', amount: 10, description: '자신도 10 반동 데미지를 받는다.' },
      { name: '바삭방어', power: 0, accuracy: 100, effect: 'defenseUp', description: '자신의 방어를 1단계 높인다.' },
      { name: '닭다리흡입', power: 0, accuracy: 100, effect: 'heal', amount: 30, description: '자신의 HP를 30 회복한다.' }
    ]
  },
  {
    id: 'router', name: '와이파이공유기', type: '전기', hp: 90, attack: 30, defense: 20, speed: 40,
    description: '연결이 끊기면 모두가 운다',
    moves: [
      { name: '5G충격', power: 40, accuracy: 95, description: '빠른 전기 충격으로 공격한다.' },
      { name: '와이파이끊기', power: 20, accuracy: 100, effect: 'speedDown', description: '적의 스피드를 1단계 낮춘다.' },
      { name: '전자파교란', power: 25, accuracy: 100, effect: 'accuracyDown', description: '적의 명중률을 1단계 낮춘다.' },
      { name: '재부팅', power: 0, accuracy: 100, effect: 'heal', amount: 35, description: '자신의 HP를 35 회복한다.' }
    ]
  },
  {
    id: 'heatingpad', name: '전기장판', type: '전기', hp: 130, attack: 28, defense: 22, speed: 12,
    description: '겨울엔 이불 밖은 위험해',
    moves: [
      { name: '온돌펀치', power: 35, accuracy: 95, description: '따뜻한 열기로 후려친다.' },
      { name: '이불속숨기', power: 0, accuracy: 100, effect: 'evasionUp', description: '이불 속에 숨어 자신의 회피율을 1단계 높인다.' },
      { name: '온도조절실패', power: 20, accuracy: 100, effect: 'accuracyDown', description: '적의 명중률을 1단계 낮춘다.' },
      { name: '과열폭주', power: 50, accuracy: 90, effect: 'recoil', amount: 15, description: '자신도 15 반동 데미지를 받는다.' }
    ]
  },
  {
    id: 'lotto', name: '로또용지', type: '인간', hp: 110, attack: 30, defense: 12, speed: 35,
    description: '이번 주 주인공은 나야 나',
    moves: [
      { name: '긁어보자', power: 30, accuracy: 100, description: '복권을 긁어 공격한다.' },
      { name: '1등당첨', power: 60, accuracy: 50, description: '맞으면 대박, 빗나가면 쪽박.' },
      { name: '꽝', power: 10, accuracy: 100, effect: 'attackDown', description: '적의 공격을 1단계 낮춘다.' },
      { name: '연금복권', power: 0, accuracy: 100, effect: 'heal', amount: 40, description: '자신의 HP를 40 회복한다.' }
    ]
  },
  {
    id: 'buldak', name: '불닭볶음면', type: '음식', hp: 120, attack: 32, defense: 18, speed: 22,
    description: '먹으면 속이 탄다',
    moves: [
      { name: '핵불닭소스', power: 45, accuracy: 90, description: '매운 소스로 공격한다.' },
      { name: '스코빌쇼크', power: 20, accuracy: 100, effect: 'accuracyDown', description: '적의 명중률을 1단계 낮춘다.' },
      { name: '면치기', power: 30, accuracy: 100, description: '면을 후루룩 빨아들여 후려친다.' },
      { name: '우유마시기', power: 0, accuracy: 100, effect: 'heal', amount: 35, description: '자신의 HP를 35 회복한다.' }
    ]
  }
];

const TYPE_MATCHUPS = {
  '인간': { '전기': 1.5, '핵': 0.75 },
  '전기': { '인간': 0.75, '음식': 1.5 },
  '음식': { '전기': 0.75, '핵': 1.5 },
  '핵': { '음식': 0.75, '인간': 1.5 }
};
