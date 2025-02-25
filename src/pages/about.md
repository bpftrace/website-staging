# About bpftrace

bpftrace uses LLVM as a backend to compile scripts to [eBPF](https://ebpf.io/what-is-ebpf/)-bytecode and makes use of [libbpf](https://github.com/libbpf/libbpf) and [bcc](https://github.com/iovisor/bcc) for interacting with the Linux BPF subsystem, as well as existing Linux tracing capabilities: kernel dynamic tracing (kprobes), user-level dynamic tracing (uprobes), tracepoints, etc. The bpftrace language is inspired by awk, C, and predecessor tracers such as DTrace and SystemTap.

bpftrace was created by Alastair Robertson.