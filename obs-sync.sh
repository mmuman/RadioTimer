#!/bin/sh

port="8010"

if [ "$#" -lt 1 ]; then
	echo "Synchronize OBS recording on 127.0.0.1:$port on GNU/Linux (X11 only)"
	echo "Usage: $0 shortcut"
	echo "shortcut is whatever key you set in OBS, like R"
	exit 1
fi

key="$1"


while true; do printf 'HTTP/1.1 100 OK\n\n' | nc -q 0 -l "$port" >/dev/null 2>&1; xdotool search --name "OBS 26" windowactivate --sync %1 key "$key" windowactivate $(xdotool getactivewindow); done
