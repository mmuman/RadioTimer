#!/bin/sh
# cf. https://wiki.documentfoundation.org/Development/Impress_Remote_Protocol

if [ "$#" -lt 1 ]; then
	echo "Synchronize with LibreOffice Impress in lieu of Linux-Show-Timer (next slide)"
	echo "Usage: $0 pin"
	echo "Use [LSP:0] to get the next slide"
	exit 1
fi

lspport=8070
name=RadioTimer
port=1599
pin="$1"

(
	#echo "GET / \r\n\r\n";
	sleep 1
	echo "LO_SERVER_CLIENT_PAIR\n$name\n$pin\n\n";
	while true; do printf 'HTTP/1.1 100 OK\n\n' | nc -q 0 -l "$lspport" >/dev/null 2>&1; echo "transition_next\n\n"; done
) | nc 127.0.0.1 "$port"
