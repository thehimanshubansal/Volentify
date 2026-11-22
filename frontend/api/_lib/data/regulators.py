"""Platform regulator accounts: four incident-administrator logins reserved for regulation and monitoring.

They are created by schema.sql on a fresh database and by the 2026-11-regulators migration on an existing one.
Only scrypt hashes are stored here (the repository is public); the passwords were handed to the account owners
separately and should be changed after the first sign-in (Administration → Change password).

The @volentify.com domain is reserved: nobody can register a new account with it (routers/auth.py).
"""

from __future__ import annotations

RESERVED_DOMAIN = "volentify.com"

REGULATORS: list[dict[str, str]] = [
    {"id": "usr_regulator_gurpreet", "name": "Gurpreet", "email": "gurpreet@volentify.com",
     "password_hash": "scrypt$ftGbrAlO/XD6boT+Jvta2w==$xc0tYoYOJ7PCB1qn6fVoWbOrU+qexLid2N+fLFncmCM="},
    {"id": "usr_regulator_gyanvir", "name": "Gyanvir", "email": "gyanvir@volentify.com",
     "password_hash": "scrypt$Lyv+EY/8I3oG0pxqwNf6nw==$2X8rGpoZT8IsnAU6G2XTlKzQ1LtO8U2T3s6oh5nQ4UM="},
    {"id": "usr_regulator_himanshu", "name": "Himanshu", "email": "himanshu@volentify.com",
     "password_hash": "scrypt$YFHnd+pNa+1hnlBNmBG+NA==$Qm9d5kbdPbNX6rb3e28kW0JjWT0skiyw9ggnirpKv1c="},
    {"id": "usr_regulator_rajveer", "name": "Rajveer", "email": "rajveer@volentify.com",
     "password_hash": "scrypt$Lu5UdFMtho32PFdSTUVYmg==$Uu7/xGk2k5XCDTuoLbWD/Al93h46eE8MEGZht8Umu24="},
]
