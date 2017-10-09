FROM python:3.6

RUN git clone https://github.com/nitram509/ascii-telnet-server.git

WORKDIR ascii-telnet-server

EXPOSE 4321 4321

COPY asciimationTools/cv.txt .

CMD ["/usr/bin/python", "ascii_telnet_server.py", "--standalone", "-f", "../cv.txt", "-p", "4321"]

