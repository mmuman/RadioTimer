#!/bin/sh
# References:
# https://wiki.documentfoundation.org/Development/Impress_Remote_Protocol
# https://cgit.freedesktop.org/libreoffice/core/tree/sd/README_REMOTE

if [ "$#" -lt 1 ]; then
	echo "Synchronize with LibreOffice Impress in lieu of Linux-Show-Timer (next slide)"
	echo "Usage: $0 pin"
	echo "Use [LSP:0] to get the next slide"
	exit 1
fi

lport=8060
name=RadioTimer
port=1599
pin="$1"

(
	echo "LO_SERVER_CLIENT_PAIR\n$name\n$pin\n\n";
	while true; do
		cmd="$(printf 'HTTP/1.1 200 OK\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n\r\n<xml></xml>' | nc -N -l "$lport" 2>/dev/null | head -1)"
		cmd="${cmd%% HTTP*}"
		cmd="${cmd#POST /}"
		#echo "cmd:x${cmd}x" >&2
		case "$cmd" in
		s|start)
			echo "presentation_start\n\n" ;;
		t|stop)
			echo "presentation_stop\n\n" ;;
		n|next)
			echo "transition_next\n\n" ;;
		p|prev|previous)
			echo "transition_previous\n\n" ;;
		b|blank)
			echo "presentation_blank_screen\n\n" ;;
		r|resume)
			echo "presentation_resume\n\n" ;;
		*)
			echo "goto_slide\n$cmd\n\n" ;;
		esac
	done
) | nc 127.0.0.1 "$port"
