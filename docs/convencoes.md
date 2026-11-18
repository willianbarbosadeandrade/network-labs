# Convenções dos labs

Padrões usados em todos os labs, para que a documentação fique consistente e fácil de comparar.

## Numeração e nomes de pasta

- `labs/01-configuracao-basica-switch`, `labs/02-vlans-e-trunk`...
- Dois dígitos, nome curto, em minúsculas e com hífens.

## Endereçamento

- Usar apenas faixas privadas (RFC 1918), por exemplo `192.168.0.0/16` e `10.0.0.0/8`.
- O terceiro octeto acompanha o número da VLAN: a VLAN 10 usa `192.168.10.0/24`, a VLAN 20 usa `192.168.20.0/24`.
- Gateway sempre no primeiro endereço útil (`.1`).
- Equipamentos de rede de `.2` a `.9`; hosts a partir de `.11`.

## Nomes de equipamentos

| Tipo | Padrão | Exemplo |
|---|---|---|
| Roteador | `R` + número | `R1` |
| Switch | `SW` + número | `SW1` |
| Computador | `PC` + número | `PC1` |
| Servidor | `SRV` + função | `SRV-DHCP` |

## Segurança dos arquivos

- Senhas dos labs são de laboratório e nunca reaproveitadas de contas reais.
- Nenhum endereço, nome ou configuração de rede real de empresa entra neste repositório.
