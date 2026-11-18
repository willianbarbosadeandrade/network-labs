# Lab NN: Título do lab

> Copie esta pasta para `labs/NN-nome-do-lab/`, preencha cada seção e apague as instruções entre colchetes.

**Assuntos:** [ex.: VLAN, trunk 802.1Q]
**Curso de referência:** [ex.: Networking Devices and Initial Configuration, módulo X]

## Objetivo

[Uma ou duas frases: o que este lab resolve. Ex.: separar a rede de um escritório em duas VLANs que não se enxergam, usando um único switch.]

## Topologia

![Topologia](topologia.png)

[Descreva em uma frase o que está na imagem: quantos switches, roteadores e PCs, e como estão ligados.]

## Plano de endereçamento

| Dispositivo | Interface | Endereço IP | Máscara | Gateway | VLAN |
|---|---|---|---|---|---|
| PC1 | Fa0 | 192.168.10.11 | 255.255.255.0 | 192.168.10.1 | 10 |
| | | | | | |

## Configuração

[Cole os comandos principais de cada equipamento. Não precisa colar a configuração inteira, só o que importa para o objetivo.]

```
SW1(config)# vlan 10
SW1(config-vlan)# name EXEMPLO
```

## Verificação

[Como você provou que funcionou: comandos `show` e testes de `ping`, com a saída ou um print.]

```
SW1# show vlan brief
```

| Teste | Resultado esperado | Resultado obtido |
|---|---|---|
| PC1 → PC2 (mesma VLAN) | responde | |
| PC1 → PC3 (VLAN diferente) | não responde | |

## Problemas que encontrei

[O que deu errado no caminho e como resolveu. Esta é a seção que mais mostra raciocínio para quem lê.]

## O que aprendi

[Duas ou três frases com as suas palavras. Se puder, ligue com algo que você vê no trabalho.]

## Arquivos

- `lab.pkt`: arquivo do Packet Tracer
- `topologia.png`: captura da topologia
